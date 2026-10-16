-- ============================================================
-- DONA SIL — G4-B — FUNÇÕES DE ESTOQUE E PEDIDO
-- ============================================================
-- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
--
-- Garantias:
--   * ATÔMICO: cada função = UMA transação. Erro no meio
--     desfaz TUDO (nunca fica débito sem pedido, ou pedido sem débito).
--   * IDEMPOTENTE: repetir a chamada não repete o efeito
--     (mesma chave = mesmo pedido; cancelar 2x devolve 1x).
--   * SEM ESTOQUE NEGATIVO: débito só acontece se
--     quantidade >= pedido. Caso contrário: erro e rollback total.
--   * PREÇO SEMPRE DO BANCO: navegador envia apenas
--     (variacao_id, quantidade). Nunca preço, nunca frete.
--
-- Execução: SOMENTE pelo servidor, com a chave secreta.
-- Nenhuma função é executável pelo navegador.
-- ============================================================

-- ------------------------------------------------------------
-- CRIAR PEDIDO
-- p_dados = {
--   nome, whatsapp, cep, endereco, complemento, bairro, cidade, uf,
--   faixa_frete_id,
--   itens: [ {variacao_id, quantidade}, ... ]
-- }
-- retorna {id, codigo}
-- ------------------------------------------------------------
create or replace function public.criar_pedido(
  p_dados jsonb,
  p_chave_idempotencia uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id        uuid;
  v_codigo    text;
  v_subtotal  numeric(10,2) := 0;
  v_frete_valor numeric(10,2) := 0;
  v_frete_nome  text := '';
  v_linhas   int;
  v_compras  boolean;
  v_item     jsonb;
  v_tentativa int := 0;
begin
  -- 1) Compras desativadas (site em demo) => recusa. Bloqueio no
  --    SERVIDOR: impossível contornar pelo navegador.
  select coalesce((valor ->> 'compras_ativas')::boolean, false)
    into v_compras
    from public.configuracoes
    where chave = 'compras_ativas';
  if v_compras is distinct from true then
    raise exception 'COMPRAS_DESATIVADAS: site em modo demonstração';
  end if;

  -- 2) Idempotência: mesma chave => devolve o MESMO pedido,
  --    sem debitar estoque de novo.
  select id, codigo into v_id, v_codigo
    from public.pedidos
    where chave_idempotencia = p_chave_idempotencia;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'codigo', v_codigo, 'ja_existia', true);
  end if;

  -- 3) Validação dos dados da cliente
  if coalesce(p_dados->>'nome', '')    = '' then raise exception 'DADOS_INVALIDOS: nome obrigatório';     end if;
  if coalesce(p_dados->>'whatsapp','') = '' then raise exception 'DADOS_INVALIDOS: whatsapp obrigatório'; end if;
  if coalesce(p_dados->>'cep', '')      = '' then raise exception 'DADOS_INVALIDOS: cep obrigatório';      end if;
  if coalesce(p_dados->>'endereco', '') = '' then raise exception 'DADOS_INVALIDOS: endereco obrigatório'; end if;
  if coalesce(p_dados->>'cidade', '')   = '' then raise exception 'DADOS_INVALIDOS: cidade obrigatório';  end if;
  if coalesce(p_dados->>'uf', '')       = '' then raise exception 'DADOS_INVALIDOS: uf obrigatório';       end if;
  if jsonb_typeof(p_dados->'itens') is distinct from 'array'
     or (select count(*) from jsonb_array_elements(p_dados->'itens')) = 0 then
    raise exception 'DADOS_INVALIDOS: itens obrigatórios';
  end if;

  -- 4) Frete: valor SEMPRE lido do banco (nunca do navegador)
  if p_dados->>'faixa_frete_id' is not null then
    select nome, valor into v_frete_nome, v_frete_valor
      from public.faixas_frete
      where id = (p_dados->>'faixa_frete_id')::uuid
        and ativo = true;
    if v_frete_nome is null then
      raise exception 'FRETE_INVALIDO: região de entrega não disponível';
    end if;
  end if;

  -- 5) DÉBITO ATÔMICO por item.
  --    "where quantidade >= pedido" = impossível ficar negativo.
  --    Se não atualizar nenhuma linha => ERRO => rollback de TUDO.
  for v_item in select value from jsonb_array_elements(p_dados->'itens')
  loop
    if coalesce((v_item->>'quantidade')::int, 0) <= 0 then
      raise exception 'DADOS_INVALIDOS: quantidade deve ser maior que zero';
    end if;
    update public.variacoes
      set quantidade = quantidade - (v_item->>'quantidade')::int
      where id = (v_item->>'variacao_id')::uuid
        and quantidade >= (v_item->>'quantidade')::int;
    get diagnostics v_linhas = row_count;
    if v_linhas = 0 then
      raise exception 'ESTOQUE_INSUFICIENTE: variacao % esgotada', v_item->>'variacao_id';
    end if;
  end loop;

  -- 6) Subtotal calculado no banco (preço de tabela, nunca do cliente)
  select coalesce(sum(p.preco * i.qtd), 0)
    into v_subtotal
    from (
      select (value->>'variacao_id')::uuid as variacao_id,
             (value->>'quantidade')::int    as qtd
      from jsonb_array_elements(p_dados->'itens')
    ) i
    join public.variacoes v on v.id = i.variacao_id
    join public.produtos  p on p.id = v.produto_id;

  -- 7) Código curto único (DS-XXXXXX), com nova tentativa em caso raríssimo de colisão
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
        trim(p_dados->>'uf'), (p_dados->>'faixa_frete_id')::uuid,
        v_frete_nome, v_frete_valor, v_subtotal, v_subtotal + v_frete_valor
      )
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_tentativa >= 5 then
        raise;
      end if;
    end;
  end loop;

  -- 8) Itens com preço congelado na hora da compra
  insert into public.itens_pedido (
    pedido_id, variacao_id, produto_nome, variacao_tamanho, variacao_cor,
    quantidade, preco_unitario
  )
  select
    v_id, v.id, p.nome, v.tamanho, v.cor,
    i.qtd, p.preco
  from (
    select (value->>'variacao_id')::uuid as variacao_id,
           (value->>'quantidade')::int    as qtd
    from jsonb_array_elements(p_dados->'itens')
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
-- enviada/entregue => erro: reposição por troca é manual, no admin.
-- ------------------------------------------------------------
create or replace function public.cancelar_pedido(p_pedido_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_devolvido boolean;
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
    update public.variacoes v
      set quantidade = v.quantidade + i.quantidade
    from public.itens_pedido i
    where i.pedido_id = p_pedido_id
      and i.variacao_id = v.id;

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
-- Idempotente: só pega status='pendente'; reexecutar não devolve 2x.
-- Tudo numa transação só.
-- ------------------------------------------------------------
create or replace function public.expirar_pedidos_pendentes(p_horas int default 48)
returns int
language plpgsql
security definer
set search_path = public
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
      set quantidade = v.quantidade + i.quantidade
    from public.itens_pedido i
    where i.pedido_id in (select id from alvos)
      and i.variacao_id = v.id
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
-- NINGUÉM da web executa estas funções diretamente.
-- Elas só rodam pelo servidor (chave secreta).
-- ------------------------------------------------------------
revoke execute on function public.criar_pedido(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public.cancelar_pedido(uuid) from public, anon, authenticated;
revoke execute on function public.expirar_pedidos_pendentes(int) from public, anon, authenticated;

-- existe_admin precisa ser executável pelo papel autenticado
-- (as políticas a chamam), mas não revela nada: só true/false.
revoke execute on function public.existe_admin() from public, anon;
grant execute on function public.existe_admin() to authenticated;
