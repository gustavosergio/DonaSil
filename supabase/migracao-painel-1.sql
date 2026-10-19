  -- ============================================================
  -- DONA SIL — PAINEL ADMIN — MIGRAÇÃO M1 (estrutura + segurança)
  -- ============================================================
  -- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
  --
  -- O que este arquivo FAZ:
  --   1) CRIA public.produto_cores  (a cor vira linha própria do
  --      produto: nome, tom e ordem na tela).
  --   2) CRIA public.produto_fotos  (galeria de fotos POR COR,
  --      com caminho do arquivo e ordem própria).
  --   3) ADICIONA a coluna cor_id em public.variacoes — NULL
  --      permitido por enquanto. O preenchimento é a migração M2
  --      (backfill); o NOT NULL é a migração M3 (travas).
  --   4) Garante integridade referencial CRUZADA: uma variação
  --      só pode apontar para uma cor do MESMO produto, por meio
  --      de chave estrangeira COMPOSTA (detalhe no item 3).
  --   5) Liga RLS e cria grants + políticas das tabelas novas,
  --      no MESMO padrão de politicas-rls.sql (existe_admin()),
  --      com a leitura pública RESTRITA a produtos ATIVOS:
  --      rascunhos e inativos não vazam pela API (item 5).
  --
  -- O que este arquivo NÃO faz:
  --   * NÃO apaga nada. As colunas legadas variacoes.cor,
  --     variacoes.cor_hex e produtos.fotos continuam intocadas
  --     (rollback fácil até a Etapa 10).
  --   * NÃO escreve dados: zero INSERT/UPDATE/DELETE de conteúdo.
  --     As tabelas novas nascem VAZIAS.
  --   * NÃO mexe em políticas, grants ou tabelas existentes.
  --   * NÃO mexe no Storage (o bucket fotos-produtos e suas
  --     políticas já estão prontos e auditados).
  --
  -- Ordem das migrações do painel (M2 e M3 AINDA NÃO EXISTEM):
  --   M1 (este arquivo)  ->  M2 backfill  ->  M3 travas
  --   NUNCA rode M3 sem o backfill de M2 aplicado e conferido.
  --
  -- Pré-requisitos (confirme ANTES de rodar):
  --   * schema.sql, politicas-rls.sql, funcoes-estoque.sql e
  --     seed-demo.sql JÁ aplicados no banco real.
  --   * A função public.existe_admin() existe (ela é criada por
  --     politicas-rls.sql). As políticas abaixo dependem dela;
  --     sem ela o script FALHA de propósito — não improvise.
  --   * Rodar no Supabase -> SQL Editor (papel postgres), como
  --     sempre. Nada pelo Table Editor (regra C5-EXT).
  --
  -- REAPLICÁVEL (pode rodar de novo sem erro e sem duplicar):
  --   * create table if not exists / add column if not exists /
  --     create index if not exists são idempotentes nativos;
  --   * a constraint adicionada a tabela EXISTENTE (variacoes)
  --     é CHECADA antes: ausente -> cria; igual -> segue com aviso;
  --     DIFERENTE -> a migração falha com erro claro;
  --   * toda política tem DROP POLICY IF EXISTS antes do CREATE;
  --   * ENABLE ROW LEVEL SECURITY e REVOKE/GRANT repetidos não
  --     fazem mal.
  --   Observação: se uma execução antiga foi INTERROMPIDA no
  --   meio, rodar de novo CRIA o que faltou. As consultas de
  --   conferência da seção 6 mostram o estado real.
  -- ============================================================

  -- ------------------------------------------------------------
  -- 1) TABELA produto_cores
  --    Hoje a cor é um texto repetido em cada variação. Aqui ela
  --    vira uma linha própria, pendurada no produto. O painel
  --    edita a cor aqui (nome, tom, ordem); as variações passam
  --    a apontar para ela por cor_id (item 3).
  -- ------------------------------------------------------------
  create table if not exists public.produto_cores (
    id          uuid primary key default gen_random_uuid(),
    produto_id  uuid not null references public.produtos(id) on delete cascade,
    nome        text not null,
    cor_hex     text not null default '#cccccc',
    ordem       int  not null default 0 check (ordem >= 0),
    criado_em   timestamptz not null default now(),

    -- A mesma cor não se repete dentro do mesmo produto.
    -- (Postgres compara texto com maiúscula/minúscula diferentes;
    --  o painel vai normalizar "Preta" -> "preta" antes de salvar.)
    constraint produto_cores_produto_nome_unico unique (produto_id, nome),

    -- Par único (id, produto_id). Existe EXCLUSIVAMENTE para
    -- servir de alvo à chave estrangeira composta do item 3.
    constraint produto_cores_id_produto_unico unique (id, produto_id)
  );

  -- ------------------------------------------------------------
  -- 2) TABELA produto_fotos
  --    Cada foto pertence a UMA cor (galeria independente por
  --    cor, como pedido: adicionar aos poucos, ordem própria).
  --    "caminho" é o endereço do arquivo DENTRO do bucket
  --    fotos-produtos (mesmo formato usado pela coluna legada
  --    produtos.fotos), ex.:
  --      fotos/saia-de-cetim/<id-da-cor>/<uuid>.jpg
  --    A ordem vive no BANCO — renomear/reenviar arquivo não
  --    bagunça a galeria.
  -- ------------------------------------------------------------
  create table if not exists public.produto_fotos (
    id          uuid primary key default gen_random_uuid(),
    cor_id      uuid not null references public.produto_cores(id) on delete cascade,
    caminho     text not null,
    ordem       int  not null default 0 check (ordem >= 0),
    criado_em   timestamptz not null default now(),

    -- A mesma imagem não entra duas vezes na mesma galeria.
    -- (Duas cores DIFERENTES podem ter a mesma imagem: é legítimo.)
    constraint produto_fotos_cor_caminho_unico unique (cor_id, caminho)
  );

  -- ------------------------------------------------------------
  -- 3) COLUNA cor_id em variacoes + INTEGRIDADE CRUZADA
  -- ------------------------------------------------------------
  -- 3a. Coluna nova, NULL permitido (fase de transição):
  --     linhas antigas ainda não têm cor; o backfill M2 preenche;
  --     a M3 adiciona NOT NULL + unique (produto_id, tamanho, cor_id).
  alter table public.variacoes
    add column if not exists cor_id uuid;

  -- 3b. O problema: uma chave estrangeira simples
  --     (cor_id -> produto_cores.id) deixaria uma variação do
  --     produto A apontar para uma cor do produto B.
  --
  --     A solução: chave estrangeira COMPOSTA. O par
  --     (cor_id, produto_id) da variação precisa existir como
  --     (id, produto_id) em produto_cores — ou seja, a cor
  --     apontada tem que pertencer AO MESMO PRODUTO da variação.
  --     Tentativa de "cor de outro produto" é recusada pelo
  --     próprio banco, sem trigger, sem confiar no painel.
  --
  --     NULL: com cor_id NULL a verificação é dispensada (comparação
  --     de FK simples não exige NULLs) — comportamento desejado
  --     até o backfill M2.
  --
  --     ON DELETE CASCADE (intencional): apagar uma cor apaga as
  --     fotos e as variações DAQUELA cor. O painel avisará antes.
  --     Apagar um produto já apagava as variações (cascade antigo
  --     do schema.sql); agora apaga também cores e fotos.
  --
  --     CASCADE × RESTRICT (histórico de vendas): itens_pedido
  --     referencia variacoes com ON DELETE RESTRICT (schema.sql,
  --     intocável). Ordem real dos eventos ao apagar uma cor:
  --       1) o cascade começa apagando as variações da cor;
  --       2) se ALGUMA variação da cor aparece em algum pedido,
  --          o RESTRICT de itens_pedido ABORTA a transação inteira;
  --       3) resultado: NADA é apagado — nem a cor, nem as fotos,
  --          nem as variações. Venda nenhuma perde referência.
  --     Regra para o futuro painel (v1):
  --       * cor SEM variação em pedido -> exclusão permitida (o
  --         banco limpa fotos e variações da cor junto);
  --       * cor COM variação em pedido -> exclusão RECUSADA pelo
  --         banco. O painel mostra o motivo e oferece a alternativa
  --         segura: ZERAR o estoque da cor (peça vira "esgotada"),
  --         em vez de excluir. A consulta 6i lista essas cores.
  --     CHECAGEM ANTES DE CRIAR (reaplicação segura): o bloco
  --     abaixo NÃO cria às cegas e NÃO engole diferença em
  --     silêncio. Três caminhos:
  --       * constraint AUSENTE             -> cria com a definição daqui;
  --       * presente com a MESMA definição -> segue (aviso NOTICE);
  --       * presente com OUTRA definição   -> ERRO e a migração PARA
  --         na hora, sem ter alterado nada. Assim, uma constraint
  --         antiga/alterada nunca é assumida por engano.
  do $$
  declare
    definicao_conforme boolean;
  begin
    -- A constraint existe na variacoes?
    if not exists (
      select 1
      from pg_catalog.pg_constraint
      where conname = 'variacoes_cor_do_mesmo_produto'
        and conrelid = 'public.variacoes'::regclass
    ) then
      -- Ausente: criar exatamente como especificado.
      alter table public.variacoes
        add constraint variacoes_cor_do_mesmo_produto
        foreign key (cor_id, produto_id)
        references public.produto_cores(id, produto_id)
        on delete cascade;
    else
      -- Existe: conferir SE a definição é a esperada —
      -- é FK (contype 'f'), aponta para produto_cores, colunas
      -- pareadas pela ORDEM dos arrays (cor_id->id e
      -- produto_id->produto_id) e exclusão em cascata ('c').
      select
        con.contype = 'f'
        and con.confrelid = 'public.produto_cores'::regclass
        and con.confdeltype = 'c'
        and (
          select string_agg(a.attname, ',' order by k.ord)
          from unnest(con.conkey) with ordinality as k(attnum, ord)
          join pg_catalog.pg_attribute a
            on a.attrelid = con.conrelid and a.attnum = k.attnum
        ) = 'cor_id,produto_id'
        and (
          select string_agg(b.attname, ',' order by k.ord)
          from unnest(con.confkey) with ordinality as k(attnum, ord)
          join pg_catalog.pg_attribute b
            on b.attrelid = con.confrelid and b.attnum = k.attnum
        ) = 'id,produto_id'
      into definicao_conforme
      from pg_catalog.pg_constraint con
      where con.conname = 'variacoes_cor_do_mesmo_produto'
        and con.conrelid = 'public.variacoes'::regclass;

      if definicao_conforme then
        raise notice
          'constraint variacoes_cor_do_mesmo_produto ja existe com a definicao esperada - nada a fazer';
      else
        raise exception
          'constraint variacoes_cor_do_mesmo_produto existe com definicao DIFERENTE da esperada (FK composta (cor_id, produto_id) -> produto_cores(id, produto_id) ON DELETE CASCADE). Migracao interrompida sem alterar nada.'
          using hint = 'Inspecione antes: select conname, contype, confdeltype, conkey, confkey from pg_constraint where conname = ''variacoes_cor_do_mesmo_produto'';';
      end if;
    end if;
  end $$;

  -- ------------------------------------------------------------
  -- 4) ÍNDICES (velocidade das consultas do painel e do site)
  --    Os unique constraints acima já criam índices próprios
  --    (produto_id+nome e id+produto_id em produto_cores;
  --     cor_id+caminho em produto_fotos). Faltam estes:
  -- ------------------------------------------------------------
  create index if not exists idx_produto_cores_produto on public.produto_cores(produto_id);
  create index if not exists idx_produto_fotos_cor     on public.produto_fotos(cor_id);
  create index if not exists idx_variacoes_cor         on public.variacoes(cor_id);

  -- ------------------------------------------------------------
  -- 5) SEGURANÇA — mesmo modelo de politicas-rls.sql
  --
  --    * Tabelas novas NACEM FECHADAS: o "alter default
  --      privileges" de politicas-rls.sql já revoga tudo de
  --      anon/authenticated para tabelas criadas pelo SQL Editor.
  --      O REVOKE abaixo é cinturão E suspensório.
  --    * Público (anon) só LÊ o que pertence a produto ATIVO
  --      (o catálogo embute cores e fotos no detalhe do produto).
  --      Rascunhos (ativo=false) e inativos NÃO vazam pela API —
  --      mais fechado que o padrão de produtos/variacoes, que
  --      seguem exatamente como estão (fora do escopo daqui).
  --      Produtos DEMO continuam visíveis (nascem ativos no seed),
  --      então o site em desenvolvimento não muda NADA.
  --      O painel lê rascunhos normalmente: admin cai na política
  --      escrita_admin_* (for all, inclui SELECT), que não depende
  --      de ativo. Sem recursão de RLS: cores consultam apenas
  --      produtos; fotos consultam cores e produtos.
  --    * Escrita: concedida ao papel "authenticated", mas a
  --      política exige existe_admin() — sem admin, zero linhas.
  --    * service_role (servidor com chave secreta): não precisa
  --      de grant, tem bypass — e este arquivo não o toca.
  --    * Nenhuma política/grant EXISTENTE é alterado ou removido.
  -- ------------------------------------------------------------
  alter table public.produto_cores enable row level security;
  alter table public.produto_fotos enable row level security;

  revoke all on public.produto_cores from anon, authenticated;
  revoke all on public.produto_fotos from anon, authenticated;

  -- Leitura pública (catálogo)
  grant select on public.produto_cores to anon, authenticated;
  grant select on public.produto_fotos to anon, authenticated;

  -- Escrita do catálogo: SOMENTE admin da lista (padrão atual)
  grant select, insert, update, delete on public.produto_cores to authenticated;
  grant select, insert, update, delete on public.produto_fotos to authenticated;

  -- Políticas (DROP antes de CREATE => reaplicar não dá erro)

  -- Leitura pública — somente cores/fotos de produto ATIVO.
  -- (Rascunho e inativo ficam invisíveis à API anônima; o site
  --  só consulta produtos ativos, então nada muda para o visitante;
  --  o painel admin lê rascunhos pela política escrita_admin_*.)
  drop policy if exists leitura_publica_produto_cores on public.produto_cores;
  create policy leitura_publica_produto_cores
    on public.produto_cores for select
    to anon, authenticated
    using (
      exists (
        select 1
        from public.produtos p
        where p.id = produto_cores.produto_id
          and p.ativo = true
      )
    );

  drop policy if exists leitura_publica_produto_fotos on public.produto_fotos;
  create policy leitura_publica_produto_fotos
    on public.produto_fotos for select
    to anon, authenticated
    using (
      exists (
        select 1
        from public.produto_cores pc
        join public.produtos p on p.id = pc.produto_id
        where pc.id = produto_fotos.cor_id
          and p.ativo = true
      )
    );

  -- Escrita: SOMENTE admin da lista
  drop policy if exists escrita_admin_produto_cores on public.produto_cores;
  create policy escrita_admin_produto_cores
    on public.produto_cores for all
    to authenticated
    using (public.existe_admin())
    with check (public.existe_admin());

  drop policy if exists escrita_admin_produto_fotos on public.produto_fotos;
  create policy escrita_admin_produto_fotos
    on public.produto_fotos for all
    to authenticated
    using (public.existe_admin())
    with check (public.existe_admin());

  -- ============================================================
  -- 6) CONFERÊNCIA — SOMENTE LEITURA, pode rodar à vontade
  --    (Rode o arquivo inteiro, ou cole cada bloco depois de
  --     aplicar. Cada bloco diz o resultado esperado.)
  -- ============================================================

  -- 6a. As duas tabelas novas existem?
  --     Esperado: 2 linhas — produto_cores, produto_fotos.
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('produto_cores', 'produto_fotos')
  order by table_name;

  -- 6b. cor_id existe em variacoes e ainda aceita NULL?
  --     Esperado: 1 linha — cor_id, YES, uuid.
  select column_name, is_nullable, data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'variacoes'
    and column_name = 'cor_id';

  -- 6c. Constraints das tabelas novas + a FK composta de variacoes.
  --     Esperado: pkey (p), uniques (u) e a FK composta
  --     variacoes_cor_do_mesmo_produto (tipo f) apontando para
  --     produto_cores.
  --     (ORDER BY 1, 2 = pelas posições das colunas. Alias de
  --      saída não pode ser usado DENTRO de expressão, como em
  --      "tabela::text" — o Postgres responderia 42703.)
  select conrelid::regclass as tabela,
        conname            as nome,
        contype            as tipo
  from pg_constraint
  where conrelid in ('public.produto_cores'::regclass,
                    'public.produto_fotos'::regclass)
    or conname = 'variacoes_cor_do_mesmo_produto'
  order by 1, 2;

  -- 6d. Índices criados?
  --     Esperado: 3 linhas.
  select tablename, indexname
  from pg_indexes
  where schemaname = 'public'
    and indexname in ('idx_produto_cores_produto',
                      'idx_produto_fotos_cor',
                      'idx_variacoes_cor')
  order by indexname;

  -- 6e. RLS ligado nas tabelas novas?
  --     Esperado: 2 linhas com rls_ativo = true.
  select c.relname as tabela,
        c.relrowsecurity as rls_ativo
  from pg_class c
  where c.relnamespace = 'public'::regnamespace
    and c.relname in ('produto_cores', 'produto_fotos')
  order by c.relname;

  -- 6f. Permissões concedidas.
  --     Esperado, para CADA uma das duas tabelas:
  --       anon           -> SELECT
  --       authenticated  -> SELECT, DELETE, INSERT, UPDATE
  select table_name, grantee, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('produto_cores', 'produto_fotos')
  order by table_name, grantee, privilege_type;

  -- 6g. Políticas criadas.
  --     Esperado: 4 linhas — leitura pública (SELECT, com filtro
  --     de produto ativo na coluna "qual") e escrita admin (ALL,
  --     com existe_admin() na coluna "qual").
  select tablename, policyname, cmd, roles, qual
  from pg_policies
  where schemaname = 'public'
    and tablename in ('produto_cores', 'produto_fotos')
  order by tablename, policyname;

  -- 6h. Estado dos DADOS (não mudou nada — M1 não escreve dados).
  --     Esperado: 0 cores, 0 fotos, 0 variações com cor_id e o
  --     total atual de variações (número positivo, o do banco).
  select
    (select count(*) from public.produto_cores)                    as total_cores,
    (select count(*) from public.produto_fotos)                    as total_fotos,
    (select count(*) from public.variacoes where cor_id is not null) as variacoes_com_cor_id,
    (select count(*) from public.variacoes)                        as total_variacoes;

  -- 6i. FERRAMENTA PARA O PAINEL (retorna VAZIO hoje: M1 não cria
  --     dados — útil depois do backfill M2 e quando houver vendas).
  --     Lista cada cor com quantas variações tem e quantas dessas
  --     variações aparecem em pedidos. Cor com
  --     "variacoes_em_pedidos > 0" NÃO pode ser excluída: o banco
  --     recusa (RESTRICT de itens_pedido) para proteger o histórico
  --     de vendas. O painel usará esta regra para oferecer ZERAR o
  --     estoque da cor em vez de excluí-la (ver comentário 3b).
  select p.nome  as produto,
        pc.nome as cor,
        count(distinct v.id)          as variacoes_da_cor,
        count(distinct ip.variacao_id) as variacoes_em_pedidos
  from public.produto_cores pc
  join public.produtos p      on p.id = pc.produto_id
  join public.variacoes v     on v.cor_id = pc.id
  left join public.itens_pedido ip on ip.variacao_id = v.id
  -- pc.id no GROUP BY: dois produtos podem ter cores com o MESMO
  -- nome ("Preta"); sem o id, a linha somaria os dois produtos.
  group by pc.id, p.nome, pc.nome
  order by p.nome, pc.nome;
