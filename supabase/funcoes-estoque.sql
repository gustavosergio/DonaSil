-- ============================================================
-- DONA SIL — ETAPA 3 (G4-B) — FUNÇÕES DE ESTOQUE E PEDIDO
-- ============================================================
-- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
--
-- Garantias:
--   * ATÔMICO: cada função = UMA transação. Erro no meio
--     desfaz TUDO (nunca fica débito sem pedido, ou pedido sem débito).
--   * IDEMPOTENTE: repetir a chamada não repete o efeito.
--     Chamadas SIMULTÂNEAS com a mesma chave são serializadas
--     (pg_advisory_xact_lock) e a segunda recebe o MESMO pedido,
--     sem debitar de novo e sem erro.
--   * SEM ESTOQUE NEGATIVO: débito só acontece se
--     quantidade >= pedido; senão erro e rollback total.
--   * PREÇO/FRETE SEMPRE DO BANCO: o navegador envia apenas
--     (variacao_id, quantidade). Nunca preço, nunca frete.
--   * PRODUTO INATIVO ou DEMO: pedido recusado, mesmo com
--     compras_ativas = true.
--   * LIMITES: máximo 20 itens no carrinho, 10 unidades por item.
--
-- Execução: SOMENTE pelo servidor (papel service_role, chave
-- secreta). anon e authenticated não têm EXECUTE.
--
-- SECURITY DEFINER + search_path = '' (vazio): todas as tabelas
-- e funções usadas são escritas com o schema na frente
-- (public.xxx, auth.uid()), então ninguém consegue sequestrar
-- a função criando objetos com o mesmo nome em outro schema.
-- ============================================================

-- ------------------------------------------------------------
-- CRIAR PEDIDO
-- p_dados = {
--   nome, whatsapp, cep, endereco, complemento, bairro, cidade, uf,
--   faixa_frete_id (obrigatório),
--   itens: [ {variacao_id, quantidade}, ... ]
-- }
-- retorna {id, codigo} — ou {id, codigo, ja_existia: true}
-- quando o pedido já existia (idempotência).
-- ------------------------------------------------------------
create or replace function public.criar_pedido(
  p_dados jsonb,
  p_chave_idempotencia uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite_item     int := 10;   -- máximo de unidades por item (variacao)
  v_limite_carrinho int := 20;  -- máximo de linhas no carrinho
  v_id              uuid;
  v_codigo          text;
  v_subtotal        numeric(10,2) := 0;
  v_frete_valor     numeric(10,2) := 0;
  v_frete_nome      text := '';
  v_compras         boolean;
  v_linhas          int;
  v_item            record;
  v_total_itens     int;
  v_ruins           int;
  v_tentativa       int := 0;
begin
  -- 0) SERIALIZA chamadas simultâneas com a MESMA chave:
  --    a segunda espera a primeira terminar e recebe o pedido
  --    já criado (em vez de falhar). A trava é liberada sozinha
  --    no fim da transação.
  perform pg_advisory_xact_lock(
    hashtext('criar_pedido:' || p_chave_idempotencia::text)
  );

  -- 1) Compras desativadas (site em demo) => recusa.
  --    Bloqueio no SERVIDOR: impossível contornar pelo navegador.
  --    A tabela guarda o VALOR DIRETO em jsonb ('true'/'false'),
  --    por isso extraimos com #>> '{}' (texto da raiz).
  select coalesce((valor #>> '{}')::boolean, false)
    into v_compras
    from public.configuracoes
    where chave = 'compras_ativas';
  if v_compras is distinct from true then
    raise exception 'COMPRAS_DESATIVADAS: site em modo demonstração';
  end if;

  -- 2) Idempotência: mesma chave => devolve o MESMO pedido,
  --    sem debitar estoque de novo. (A chamada simultânea
  --    também cai aqui, depois de esperar a trava do passo 0.)
  select id, codigo into v_id, v_codigo
    from public.pedidos
    where chave_idempotencia = p_chave_idempotencia;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'ja_existia', true);
  end if;

  -- 3) Validação dos dados da cliente -------------------------
  if coalesce(p_dados->>'nome', '') = ''
     or char_length(p_dados->>'nome') > 200 then
    raise exception 'DADOS_INVALIDOS: nome obrigatório (até 200 letras)';
  end if;
  if coalesce(p_dados->>'whatsapp', '') = ''
     or char_length(p_dados->>'whatsapp') > 30 then
    raise exception 'DADOS_INVALIDOS: whatsapp obrigatório (até 30 dígitos)';
  end if;
  if coalesce(p_dados->>'cep', '') = ''
     or char_length(p_dados->>'cep') > 20 then
    raise exception 'DADOS_INVALIDOS: cep obrigatório';
  end if;
  if coalesce(p_dados->>'endereco', '') = ''
     or char_length(p_dados->>'endereco') > 300 then
    raise exception 'DADOS_INVALIDOS: endereco obrigatório (até 300 letras)';
  end if;
  if coalesce(p_dados->>'cidade', '') = ''
     or char_length(p_dados->>'cidade') > 120 then
    raise exception 'DADOS_INVALIDOS: cidade obrigatória';
  end if;
  if coalesce(upper(trim(p_dados->>'uf')), '') !~ '^[A-Z]{2}$' then
    raise exception 'DADOS_INVALIDOS: uf deve ter 2 letras (ex.: PE)';
  end if;
  if char_length(coalesce(p_dados->>'complemento', '')) > 200
     or char_length(coalesce(p_dados->>'bairro', '')) > 120 then
    raise exception 'DADOS_INVALIDOS: complemento/bairro muito longo';
  end if;

  -- 4) Validação da estrutura do carrinho ---------------------
  if jsonb_typeof(p_dados->'itens') is distinct from 'array' then
    raise exception 'DADOS_INVALIDOS: itens do carrinho ausentes';
  end if;
  select count(*) into v_total_itens
    from jsonb_array_elements(p_dados->'itens');
  if v_total_itens = 0 then
    raise exception 'DADOS_INVALIDOS: carrinho vazio';
  end if;
  if v_total_itens > v_limite_carrinho then
    raise exception 'DADOS_INVALIDOS: máximo % itens por pedido', v_limite_carrinho;
  end if;

  -- Cada item: objeto com variacao_id (uuid válido) e
  -- quantidade (número inteiro de 1 até o limite).
  -- CASE garante ordem de avaliação: só converte em número
  -- depois que o texto passar no teste de formato.
  select count(*) into v_ruins
    from jsonb_array_elements(p_dados->'itens') e
    where jsonb_typeof(e.value) is distinct from 'object'
       or coalesce(e.value->>'variacao_id', '') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (case
             when coalesce(e.value->>'quantidade', '') ~ '^[0-9]{1,4}$'
               then (e.value->>'quantidade')::int
             else v_limite_item + 1
           end) < 1
       or (case
             when coalesce(e.value->>'quantidade', '') ~ '^[0-9]{1,4}$'
               then (e.value->>'quantidade')::int
             else v_limite_item + 1
           end) > v_limite_item;
  if v_ruins > 0 then
    raise exception 'DADOS_INVALIDOS: item malformado ou quantidade acima de %', v_limite_item;
  end if;

  -- 5) Frete: obrigatório. ID validado antes de converter, valor
  --    SEMPRE lido do banco (nunca do navegador).
  if p_dados->>'faixa_frete_id' is null
     or p_dados->>'faixa_frete_id' !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'DADOS_INVALIDOS: faixa_frete_id ausente ou inválido';
  end if;
  select nome, valor into v_frete_nome, v_frete_valor
    from public.faixas_frete
    where id = (p_dados->>'faixa_frete_id')::uuid
      and ativo = true;
  if v_frete_nome is null then
    raise exception 'FRETE_INVALIDO: região de entrega não disponível';
  end if;

  -- 6) Validação de catálogo ANTES de debitar:
  --    toda variação existe, produto ativo, produto NÃO demo.
  select count(*) into v_ruins
    from (
      select (e.value->>'variacao_id')::uuid as variacao_id
      from jsonb_array_elements(p_dados->'itens') e
    ) i
    left join public.variacoes v on v.id = i.variacao_id
    left join public.produtos  p on p.id = v.produto_id
    where v.id is null
       or p.id is null
       or p.ativo = false
       or p.demo = true;
  if v_ruins > 0 then
    raise exception 'PRODUTO_INDISPONIVEL: item inexistente, inativo ou de demonstração';
  end if;

  -- 7) DÉBITO ATÔMICO por variação.
  --    * Itens repetidos no carrinho são UNIFICADOS (somados)
  --      antes de debitar — evita débito duplo na mesma variação.
  --    * ORDER BY fixo evita deadlock entre compras simultâneas.
  --    * "quantidade >= pedido" => impossível ficar negativo.
  --    * A condição extra no UPDATE repete a regra
  --      ativo/não-demo: vale mesmo se alguém desativar o produto
  --      no exato instante da compra.
  for v_item in
    select (e.value->>'variacao_id')::uuid as variacao_id,
           sum((e.value->>'quantidade')::int) as qtd
    from jsonb_array_elements(p_dados->'itens') e
    group by 1
    order by 1
  loop
    update public.variacoes v
      set quantidade = v.quantidade - v_item.qtd
      where v.id = v_item.variacao_id
        and v.quantidade >= v_item.qtd
        and exists (
          select 1 from public.produtos p
          where p.id = v.produto_id
            and p.ativo = true
            and p.demo = false
        );
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      raise exception 'ESTOQUE_INSUFICIENTE: variacao % esgotada', v_item.variacao_id;
    end if;
  end loop;

  -- 8) Subtotal calculado no banco (preço de tabela).
  select coalesce(sum(p.preco * i.qtd), 0)
    into v_subtotal
    from (
      select (e.value->>'variacao_id')::uuid as variacao_id,
             sum((e.value->>'quantidade')::int) as qtd
      from jsonb_array_elements(p_dados->'itens') e
      group by 1
    ) i
    join public.variacoes v on v.id = i.variacao_id
    join public.produtos  p on p.id = v.produto_id;

  -- 9) Código curto único (DS-XXXXXX). Em caso raríssimo de
  --    colisão, tenta outro. Se a colisão for da CHAVE de
  --    idempotência (corrida vencida), devolve o pedido existente.
  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := 'DS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    begin
      insert into public.pedidos (
        codigo, chave_idempotencia,
        nome_cliente, whatsapp, cep, endereco, complemento, bairro, cidade, uf,
        faixa_frete_id, frete_nome, frete_valor, subtotal, total
      ) values (
        v_codigo, p_chave_idempotencia,
        trim(p_dados->>'nome'), trim(p_dados->>'whatsapp'), trim(p_dados->>'cep'),
        trim(p_dados->>'endereco'), coalesce(trim(p_dados->>'complemento'), ''),
        coalesce(trim(p_dados->>'bairro'), ''), trim(p_dados->>'cidade'),
        upper(trim(p_dados->>'uf')), (p_dados->>'faixa_frete_id')::uuid,
        v_frete_nome, v_frete_valor, v_subtotal, v_subtotal + v_frete_valor
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      -- Perdeu corrida para a MESMA chave? Devolve o pedido vencedor.
      select id, codigo into v_id, v_codigo
        from public.pedidos
        where chave_idempotencia = p_chave_idempotencia;
      if v_id is not null then
        return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'ja_existia', true);
      end if;
      -- Colisão foi só do código curto: tenta de novo (até 5x).
      if v_tentativa >= 5 then
        raise;
      end if;
    end;
  end loop;

  -- 10) Itens congelados: nome, tamanho, cor e preço da HORA da compra.
  insert into public.itens_pedido (
    pedido_id, variacao_id, produto_nome, variacao_tamanho, variacao_cor,
    quantidade, preco_unitario
  )
  select
    v_id, v.id, p.nome, v.tamanho, v.cor,
    i.qtd, p.preco
  from (
    select (e.value->>'variacao_id')::uuid as variacao_id,
           sum((e.value->>'quantidade')::int) as qtd
    from jsonb_array_elements(p_dados->'itens') e
    group by 1
  ) i
  join public.variacoes v on v.id = i.variacao_id
  join public.produtos  p on p.id = v.produto_id;

  return jsonb_build_object('id', v_id, 'codigo', v_codigo);
end;
$$;

-- ------------------------------------------------------------
-- CANCELAR PEDIDO (somente pendente ou confirmada)
-- Devolve estoque UMA única vez (trava estoque_devolvido).
-- Repetir a chamada = efeito zero (idempotente).
-- enviada/entregue => erro: reposição é manual, no admin.
--
-- Devolução SOMA as quantidades POR VARIAÇÃO antes de creditar:
-- se o pedido tiver 2 linhas da mesma variação, devolve a soma
-- (SUM + GROUP BY), não uma linha qualquer.
-- ------------------------------------------------------------
create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status     text;
  v_devolvido  boolean;
begin
  perform 1 from public.pedidos
    where id = p_pedido_id
    for update;                          -- trava o pedido contra corrida
  if not found then
    raise exception 'PEDIDO_INEXISTENTE';
  end if;

  select status, estoque_devolvido into v_status, v_devolvido
    from public.pedidos where id = p_pedido_id;

  if v_status in ('cancelada', 'expirada') then
    return 'JA_PROCESSADO';              -- idempotente: nada repete
  end if;

  if v_status not in ('pendente', 'confirmada') then
    raise exception 'STATUS_INVALIDO: pedido % não pode ser cancelado por aqui', v_status;
  end if;

  if v_devolvido = false then
    -- SOMA por variação antes de devolver (defesa contra
    -- linhas repetidas de mesma variação no pedido).
    update public.variacoes v
      set quantidade = v.quantidade + r.total
    from (
      select variacao_id, sum(quantidade) as total
      from public.itens_pedido
      where pedido_id = p_pedido_id
      group by variacao_id
    ) r
    where r.variacao_id = v.id;

    update public.pedidos
      set estoque_devolvido = true
      where id = p_pedido_id;
  end if;

  update public.pedidos
    set status = 'cancelada'
    where id = p_pedido_id;

  return 'CANCELADO';
end;
$$;

-- ------------------------------------------------------------
-- EXPIRAR PENDENTES (executada pelo cron diário e pelo admin)
-- Pendentes com mais de 48h: devolve estoque e marca 'expirada'.
-- Idempotente: só pega status='pendente'; reexecutar não devolve 2x
-- (pedido expirado/cancelado sai do filtro). Tudo numa transação.
--
-- Devolução também SOMA por variação (GROUP BY) antes de creditar.
-- ------------------------------------------------------------
create or replace function public.expirar_pedidos_pendentes(p_horas int default 48)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int := 0;
begin
  with alvos as (
    select id from public.pedidos
    where status = 'pendente'
      and criado_em < now() - make_interval(hours => p_horas)
    for update
  ),
  devolucao as (
    update public.variacoes v
      set quantidade = v.quantidade + r.total
    from (
      select i.variacao_id, sum(i.quantidade) as total
      from public.itens_pedido i
      where i.pedido_id in (select id from alvos)
      group by i.variacao_id
    ) r
    where r.variacao_id = v.id
    returning 1
  )
  update public.pedidos p
    set status = 'expirada',
        estoque_devolvido = true
  from alvos a
  where p.id = a.id;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- ------------------------------------------------------------
-- PERMISSÕES DE EXECUÇÃO
--
-- anon (visitante) e authenticated (cliente logada comum):
--   NENHUMA destas funções. Nem descobrir que elas existem, pelo
--   lado público da API.
-- service_role (servidor do site, com a chave secreta):
--   pode executar as três. É o único caminho para criar,
--   cancelar ou expirar pedido.
-- existe_admin: precisa ser executável por authenticated
--   (as políticas RLS a chamam); só devolve true/false,
--   não expõe nada. anon não precisa.
-- ------------------------------------------------------------
revoke execute on function public.criar_pedido(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.cancelar_pedido(uuid) from public, anon, authenticated;
revoke execute on function public.expirar_pedidos_pendentes(int) from public, anon, authenticated;

grant execute on function public.criar_pedido(jsonb, uuid) to service_role;
grant execute on function public.cancelar_pedido(uuid) to service_role;
grant execute on function public.expirar_pedidos_pendentes(int) to service_role;

revoke execute on function public.existe_admin() from public, anon;
grant execute on function public.existe_admin() to authenticated;
