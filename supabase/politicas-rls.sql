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
--   4) Escrita de pedido acontece SÓ pelas funções de
--      funcoes-estoque.sql, executadas pelo servidor
--      (service_role, chave secreta).
--
-- REAPLICÁVEL: este arquivo pode rodar de novo sem erro.
--   * toda política tem DROP POLICY IF EXISTS antes do CREATE;
--   * ALTER TABLE ENABLE ROW LEVEL SECURITY repetido não faz mal;
--   * REVOKE/GRANT repetidos não criam duplicatas.
-- ============================================================

-- Função central: o usuário logado é admin autorizado?
-- SECURITY DEFINER = roda como dono (postgres), evita recursão
-- de RLS (a tabela admin_usuarios é dela).
-- search_path = '' : tudo qualificado (public.x, auth.uid()),
-- ninguém sequestra a função criando objeto com nome igual.
create or replace function public.existe_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
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

-- REMOVE permissões genéricas do Supabase (dá demais por padrão:
-- anon e authenticated nascem com GRANT ALL em tabelas novas).
revoke all on all tables in schema public from anon, authenticated;

-- FUTURO: tabelas criadas DEPOIS deste arquivo também nascem sem
-- permissões para anon/authenticated. Sem isso, uma tabela nova
-- esquecida ficaria aberta (o REVOKE acima só pega as tabelas
-- que já existiam). Quem criar tabela nova concede o mínimo na mão.
-- Observação: vale para objetos criados pelo MESMO papel que roda
-- este script. No Supabase, o SQL Editor roda como "postgres" — então
-- cobre tabelas criadas por scripts SQL. Tabelas criadas pelo Table
-- Editor do painel podem ter outro dono: confirmar com o teste do
-- README antes de confiar. O service_role NÃO é mexido (o servidor
-- continua podendo ler).
alter default privileges in schema public
  revoke all on tables from anon, authenticated;

-- Recoloca o MÍNIMO necessário, por papel ---------------------
-- Catálogo: leitura pública (poder LER, não ESCRITA).
grant select on public.categorias     to anon, authenticated;
grant select on public.produtos       to anon, authenticated;
grant select on public.variacoes     to anon, authenticated;
grant select on public.faixas_frete   to anon, authenticated;

-- Escrita do catálogo: concedida ao papel "authenticated",
-- mas TODA política abaixo exige existe_admin(). Sem admin,
-- o usuário logado comum vê ZERO linhas e escreve ZERO.
grant select, insert, update, delete on public.categorias     to authenticated;
grant select, insert, update, delete on public.produtos       to authenticated;
grant select, insert, update, delete on public.variacoes     to authenticated;
grant select, insert, update, delete on public.faixas_frete   to authenticated;

-- Pedidos: leitura só para admin. ESCRITA NEM É CONCEDIDA —
-- nem ao admin pelo navegador. Cancelar/expirar passam pelas
-- funções (service_role). Assim ninguém edita total, status
-- ou a trava estoque_devolvido direto pela API.
grant select on public.pedidos       to authenticated;
grant select on public.itens_pedido  to authenticated;

-- Configurações: admin lê e atualiza (liga/desliga compras).
grant select, update on public.configuracoes   to authenticated;
-- Lista de admins: admin lê (para o painel mostrar quem é).
grant select          on public.admin_usuarios to authenticated;

-- service_role: TEM bypass de RLS no Supabase e é usado apenas
-- pelo servidor com a chave secreta. Não precisa de GRANT aqui.

-- POLÍTICAS ----------------------------------------------------
-- (DROP antes de CREATE => reaplicar o arquivo não dá erro.)

-- Leitura pública do catálogo
drop policy if exists leitura_publica_categorias on public.categorias;
create policy leitura_publica_categorias
  on public.categorias for select
  to anon, authenticated
  using (true);

drop policy if exists leitura_publica_produtos on public.produtos;
create policy leitura_publica_produtos
  on public.produtos for select
  to anon, authenticated
  using (true);

drop policy if exists leitura_publica_variacoes on public.variacoes;
create policy leitura_publica_variacoes
  on public.variacoes for select
  to anon, authenticated
  using (true);

drop policy if exists leitura_publica_faixas_frete on public.faixas_frete;
create policy leitura_publica_faixas_frete
  on public.faixas_frete for select
  to anon, authenticated
  using (true);

-- Escrita do catálogo: SOMENTE admin da lista
drop policy if exists escrita_admin_categorias on public.categorias;
create policy escrita_admin_categorias
  on public.categorias for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

drop policy if exists escrita_admin_produtos on public.produtos;
create policy escrita_admin_produtos
  on public.produtos for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

drop policy if exists escrita_admin_variacoes on public.variacoes;
create policy escrita_admin_variacoes
  on public.variacoes for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

drop policy if exists escrita_admin_faixas_frete on public.faixas_frete;
create policy escrita_admin_faixas_frete
  on public.faixas_frete for all
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

-- Pedidos: visíveis SOMENTE ao admin (e nada de UPDATE/DELETE
-- pela API: sem GRANT, sem política de escrita).
drop policy if exists leitura_admin_pedidos on public.pedidos;
create policy leitura_admin_pedidos
  on public.pedidos for select
  to authenticated
  using (public.existe_admin());

drop policy if exists leitura_admin_itens_pedido on public.itens_pedido;
create policy leitura_admin_itens_pedido
  on public.itens_pedido for select
  to authenticated
  using (public.existe_admin());

-- Configurações: somente admin
drop policy if exists leitura_admin_configuracoes on public.configuracoes;
create policy leitura_admin_configuracoes
  on public.configuracoes for select
  to authenticated
  using (public.existe_admin());

drop policy if exists escrita_admin_configuracoes on public.configuracoes;
create policy escrita_admin_configuracoes
  on public.configuracoes for update
  to authenticated
  using (public.existe_admin())
  with check (public.existe_admin());

-- Lista de admins: somente admin vê
drop policy if exists leitura_admin_admin_usuarios on public.admin_usuarios;
create policy leitura_admin_admin_usuarios
  on public.admin_usuarios for select
  to authenticated
  using (public.existe_admin());

-- ------------------------------------------------------------
-- STORAGE: bucket de fotos do catálogo
-- Público para LER (o catálogo precisa exibir as fotos).
-- Escrever/substituir/excluir: SOMENTE admin.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fotos-produtos', 'fotos-produtos', true)
on conflict (id) do nothing;

drop policy if exists leitura_publica_fotos on storage.objects;
create policy leitura_publica_fotos
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'fotos-produtos');

drop policy if exists escrita_admin_fotos on storage.objects;
create policy escrita_admin_fotos
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'fotos-produtos' and public.existe_admin());

drop policy if exists atualizacao_admin_fotos on storage.objects;
create policy atualizacao_admin_fotos
  on storage.objects for update
  to authenticated
  using (bucket_id = 'fotos-produtos' and public.existe_admin())
  with check (bucket_id = 'fotos-produtos' and public.existe_admin());

drop policy if exists exclusao_admin_fotos on storage.objects;
create policy exclusao_admin_fotos
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'fotos-produtos' and public.existe_admin());
