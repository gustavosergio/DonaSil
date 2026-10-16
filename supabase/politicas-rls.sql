-- ============================================================
-- DONA SIL — G4-B — SEGURANÇA (RLS + PERMISSÕES)
-- ============================================================
-- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
--
-- Princípios:
--   1) Só quem está na tabela admin_usuarios escreve.
--      "Logado" NÃO significa admin.
--   2) Público (anon) só LÊ o catálogo: categorias, produtos,
--      variações, faixas de frete e fotos do bucket.
--   3) Pedidos e dados de cliente: invisíveis ao público.
--   4) Escrita de pedido acontece SÓ pela função criar_pedido,
--      executada pelo servidor com a chave secreta.
-- ============================================================

-- Função central: o usuário logado é admin autorizado?
-- SECURITY DEFINER = roda como dono, evita recursão de RLS.
create or replace function public.existe_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_usuarios
    where user_id = auth.uid()
  );
$$;

-- ATIVA o tranco principal (RLS) em TODAS as tabelas -----------
alter table public.categorias     enable row level security;
alter table public.produtos       enable row level security;
alter table public.variacoes     enable row level security;
alter table public.faixas_frete   enable row level security;
alter table public.configuracoes  enable row level security;
alter table public.admin_usuarios enable row level security;
alter table public.pedidos        enable row level security;
alter table public.itens_pedido   enable row level security;

-- REMOVE permissões genéricas do Supabase (dá demais por padrão)
revoke all on all tables in schema public from anon, authenticated;

-- Recoloca o MÍNIMO necessário, por papel ---------------------
-- Catálogo: leitura pública
grant select on public.categorias     to anon, authenticated;
grant select on public.produtos       to anon, authenticated;
grant select on public.variacoes     to anon, authenticated;
grant select on public.faixas_frete   to anon, authenticated;

-- Escrita do catálogo: concedida ao papel "authenticated",
-- mas TODA política abaixo exige existe_admin() — sem admin,
-- o usuário logado comum vê ZERO linhas e escreve ZERO.
grant select, insert, update, delete on public.categorias     to authenticated;
grant select, insert, update, delete on public.produtos       to authenticated;
grant select, insert, update, delete on public.variacoes     to authenticated;
grant select, insert, update, delete on public.faixas_frete   to authenticated;

-- Pedidos: leitura só para admin; ESCRITA NEM É CONCEDIDA
-- (criação de pedido só pela função, com chave secreta do servidor)
grant select on public.pedidos       to authenticated;
grant select on public.itens_pedido  to authenticated;

-- Configurações e lista de admins: leitura/escrita só admin
grant select, update on public.configuracoes   to authenticated;
grant select          on public.admin_usuarios to authenticated;

-- POLÍTICAS ----------------------------------------------------

-- Leitura pública do catálogo
create policy leitura_publica_categorias
  on public.categorias for select
  to anon, authenticated
  using (true);

create policy leitura_publica_produtos
  on public.produtos for select
  to anon, authenticated
  using (true);

create policy leitura_publica_variacoes
  on public.variacoes for select
  to anon, authenticated
  using (true);

create policy leitura_publica_faixas_frete
  on public.faixas_frete for select
  to anon, authenticated
  using (true);

-- Escrita do catálogo: SOMENTE admin da lista
create policy escrita_admin_categorias
  on public.categorias for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

create policy escrita_admin_produtos
  on public.produtos for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

create policy escrita_admin_variacoes
  on public.variacoes for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

create policy escrita_admin_faixas_frete
  on public.faixas_frete for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

-- Pedidos: visíveis SOMENTE ao admin
create policy leitura_admin_pedidos
  on public.pedidos for select
  to authenticated
  using (public.existe_admin());

create policy leitura_admin_itens_pedido
  on public.itens_pedido for select
  to authenticated
  using (public.existe_admin());

-- Configurações: somente admin
create policy leitura_admin_configuracoes
  on public.configuracoes for select
  to authenticated
  using (public.existe_admin());

create policy escrita_admin_configuracoes
  on public.configuracoes for update
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

-- Lista de admins: somente admin vê
create policy leitura_admin_admin_usuarios
  on public.admin_usuarios for select
  to authenticated
  using (public.existe_admin());

-- STORAGE: bucket de fotos do catálogo -------------------------
-- Público para LER (o catálogo precisa exibir as fotos).
-- Escrever/substituir/excluir: SOMENTE admin.
insert into storage.buckets (id, name, public)
values ('fotos-produtos', 'fotos-produtos', true)
on conflict (id) do nothing;

create policy leitura_publica_fotos
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos-produtos');

create policy escrita_admin_fotos
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos-produtos' and public.existe_admin());

create policy atualizacao_admin_fotos
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos-produtos' and public.existe_admin())
  with check (bucket_id = 'fotos-produtos' and public.existe_admin());

create policy exclusao_admin_fotos
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos-produtos' and public.existe_admin());
