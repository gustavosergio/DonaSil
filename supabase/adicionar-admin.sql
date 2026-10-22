-- ============================================================
-- DONA SIL — ADICIONAR ADMINISTRADORA (TEMPLATE MANUAL)
-- ============================================================
-- STATUS: TEMPLATE — PREENCHER E RODAR À MÃO NO SQL EDITOR.
-- Não é migração e não é executado pelo site: apenas associa
-- um usuário do Supabase Auth à tabela admin_usuarios (a única
-- fonte de quem pode entrar no painel).
--
-- PRÉ-REQUISITO (feito no painel do Supabase, sem SQL):
--   Authentication → Users → "Add user" — crie a conta com o
--   e-mail e a senha REAIS da administradora. Confirme a
--   criação do usuário antes de continuar.
--
-- COMO USAR:
--   1. Substitua o e-mail de exemplo nas DUAS consultas abaixo.
--   2. Rode a consulta 1: tem que aparecer exatamente 1 linha
--      (o usuário do Auth). Se não aparecer, o usuário ainda
--      não existe — crie-o primeiro (pré-requisito acima).
--   3. Rode a consulta 2: ela insere APENAS o id mostrado na
--      consulta 1 na tabela admin_usuarios. Nenhum UUID é
--      inventado; a tabela é a mesma que a função existe_admin()
--      consulta a cada login.
--
-- Depois disso, entre em /admin/login com esse e-mail e senha.
-- ============================================================

-- 1) Localize o usuário no Auth (esperado: exatamente 1 linha):
select id, email, created_at, email_confirmed_at
from auth.users
where lower(email) = lower('email-da-administradora@exemplo.com');

-- 2) Associe ao painel (insere só o id encontrado acima;
--    rodar de novo não duplica — on conflict do nothing):
insert into public.admin_usuarios (user_id)
select id
from auth.users
where lower(email) = lower('email-da-administradora@exemplo.com')
on conflict (user_id) do nothing;

-- 3) Conferência (somente leitura) — deve listar a administradora:
select user_id, criado_em
from public.admin_usuarios;
