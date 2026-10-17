-- ============================================================
-- DONA SIL — ETAPA 3 — VALIDAÇÃO: RLS ATIVO NAS 8 TABELAS
-- ============================================================
-- Consulta SOMENTE LEITURA: não altera nada no banco.
-- Como usar: Supabase → SQL Editor → cole → Run.
--
-- Esperado: 8 linhas, todas com rls_ativo = t (true).
--   - linha faltando  = tabela não criada (aplicar schema.sql)
--   - rls_ativo = f   = RLS não aplicada (aplicar politicas-rls.sql)
-- ============================================================

select
    c.relname as tabela,
    c.relrowsecurity as rls_ativo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'categorias',
    'produtos',
    'variacoes',
    'faixas_frete',
    'configuracoes',
    'admin_usuarios',
    'pedidos',
    'itens_pedido'
  )
order by c.relname;
