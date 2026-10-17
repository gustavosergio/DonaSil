-- ============================================================
-- DONA SIL — ETAPA 3 (G4-B) — ESTRUTURA DAS TABELAS
-- ============================================================
-- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
-- Ordem de aplicação (futura):
--   1) schema.sql  2) politicas-rls.sql
--   3) funcoes-estoque.sql  4) seed-demo.sql
-- ============================================================

-- CATEGORIAS --------------------------------------------------
create table if not exists public.categorias (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null unique,
  slug    text not null unique,
  ordem   int  not null default 0
);

-- PRODUTOS ---------------------------------------------------
create table if not exists public.produtos (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  nome         text not null,
  descricao    text not null default '',
  composicao   text not null default '',   -- composição do tecido (opcional)
  cuidados     text not null default '',   -- cuidados da peça (opcional)
  preco        numeric(10,2) not null check (preco >= 0),
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  fotos        text[] not null default '{}',  -- caminhos no Storage (bucket fotos-produtos)
  ativo        boolean not null default true,
  destaque     boolean not null default false, -- aparece na home
  demo         boolean not null default false, -- produto fictício (removido na publicação)
  criado_em    timestamptz not null default now()
);

-- VARIAÇÕES = ESTOQUE (produto + tamanho + cor) ---------------
create table if not exists public.variacoes (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  tamanho     text not null,
  cor         text not null,
  cor_hex     text not null default '#cccccc',
  quantidade  int  not null default 0 check (quantidade >= 0), -- impossível ficar negativo
  unique (produto_id, tamanho, cor)
);

-- FAIXAS DE FRETE (valor fixo por região) ---------------------
create table if not exists public.faixas_frete (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique,
  valor  numeric(10,2) not null check (valor >= 0),
  ativo  boolean not null default true,
  ordem  int not null default 0
);

-- CONFIGURAÇÕES (chave/valor) ---------------------------
-- O valor é o DADO DIRETO em jsonb (escalar), não um objeto.
-- Exemplo: chave 'compras_ativas', valor 'false'::jsonb.
-- As funções leem com: (valor #>> '{}')::boolean
create table if not exists public.configuracoes (
  chave  text primary key,
  valor  jsonb not null
);

-- ADMINISTRADORES (única fonte de quem pode mexer no site) -----
create table if not exists public.admin_usuarios (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

-- PEDIDOS ----------------------------------------------------
create table if not exists public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique,          -- ex.: DS-4F7A2C (conversa com a cliente)
  chave_idempotencia uuid not null unique,          -- mesma tentativa = mesmo pedido
  nome_cliente       text not null,
  whatsapp           text not null,
  cep                text not null,
  endereco           text not null,
  complemento        text not null default '',
  bairro             text not null default '',
  cidade             text not null,
  uf                 text not null,
  faixa_frete_id     uuid references public.faixas_frete(id) on delete set null,
  frete_nome         text not null default '',       -- nome congelado na compra
  frete_valor        numeric(10,2) not null default 0, -- valor congelado na compra
  subtotal           numeric(10,2) not null default 0,
  total              numeric(10,2) not null default 0,
  status             text not null default 'pendente'
    check (status in ('pendente','confirmada','enviada','entregue','cancelada','expirada')),
  estoque_devolvido  boolean not null default false, -- trava contra devolução dupla
  criado_em          timestamptz not null default now()
);

-- ITENS DO PEDIDO (foto congelada: preço e nomes na hora) ------
create table if not exists public.itens_pedido (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references public.pedidos(id) on delete cascade,
  variacao_id       uuid not null references public.variacoes(id) on delete restrict,
  produto_nome      text not null,
  variacao_tamanho  text not null,
  variacao_cor      text not null,
  quantidade        int not null check (quantidade > 0),
  preco_unitario    numeric(10,2) not null            -- preço NO MOMENTO da compra
);

-- ÍNDICES (velocidade de consulta) ----------------------------
create index if not exists idx_produtos_categoria  on public.produtos(categoria_id);
create index if not exists idx_produtos_slug       on public.produtos(slug);
create index if not exists idx_produtos_ativo      on public.produtos(ativo);
create index if not exists idx_variacoes_produto   on public.variacoes(produto_id);
create index if not exists idx_pedidos_status      on public.pedidos(status);
create index if not exists idx_pedidos_criado_em   on public.pedidos(criado_em);
create index if not exists idx_itens_pedido_pedido on public.itens_pedido(pedido_id);
create index if not exists idx_itens_pedido_variacao on public.itens_pedido(variacao_id);
