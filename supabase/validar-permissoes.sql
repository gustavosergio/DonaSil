-- ============================================================
-- DONA SIL — ETAPA 3 — VALIDAÇÃO: PERMISSÕES DE anon E authenticated
-- ============================================================
-- Consulta SOMENTE LEITURA: não altera nada no banco.
-- Como usar: Supabase → SQL Editor → cole → Run.
--
-- Esperado (após aplicar politicas-rls.sql):
--   anon          → SELECT APENAS em: categorias, produtos,
--                   variacoes, faixas_frete. Nada mais.
--   authenticated → SELECT nessas 4 + INSERT/UPDATE/DELETE nelas
--                   + SELECT em pedidos, itens_pedido,
--                     configuracoes e admin_usuarios
--                   + UPDATE em configuracoes.
-- Qualquer grant fora disso (ex.: anon em pedidos) = erro.
--
-- Obs.: mostra só os papéis da web de propósito; execução de
-- funções e privilégios padrão são verificados por outros testes.
-- ============================================================

select
    table_name,
    grantee,
    privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
