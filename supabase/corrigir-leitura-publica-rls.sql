-- ============================================================
-- DONA SIL — CORREÇÃO RLS: leitura pública de produtos e variações
-- ============================================================
-- STATUS: AGUARDA REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
--
-- O problema: as políticas atuais de leitura pública
-- (politicas-rls.sql) usam USING (true). O site filtra
-- ativo=eq.true na consulta, mas quem chamar a API pública
-- (REST/PostgREST) diretamente com a chave publicável —
-- que via no HTML de qualquer visitante — lê produtos
-- INATIVOS (rascunhos): nome, preço, descrição, slug e o
-- estoque das variações. Hoje o banco não tem rascunhos
-- (verificado em 22/10/2026), mas o primeiro cadastro como
-- rascunho vazaria.
--
-- A correção: o público só lê peça PUBLICADA (ativo = true).
-- Padrão idêntico ao que o projeto JÁ usa para produto_cores
-- e produto_fotos (migracao-painel-1.sql) — a migração M1
-- deixou registrado que produtos/variacoes ficavam "exatamente
-- como estão (fora do escopo daqui)". Este arquivo fecha isso.
--
-- O que este arquivo FAZ:
--   * Substitui APENAS as duas políticas de leitura pública:
--       - leitura_publica_produtos  (public.produtos)
--       - leitura_publica_variacoes (public.variacoes)
--
-- O que este arquivo NÃO faz:
--   * NÃO altera escrita_admin_produtos / escrita_admin_variacoes
--     — o painel continua lendo rascunhos por elas (FOR ALL
--     inclui SELECT e a condição não depende de ativo);
--   * NÃO altera grants, funções, dados, Storage, fretes ou
--     configurações;
--   * NÃO usa existe_admin() nas políticas públicas: anon não
--     tem EXECUTE na função (revogado em funcoes-estoque.sql);
--     chamar a função aqui QUEBRARIA o catálogo todo
--     ("permission denied for function existe_admin").
--
-- Impacto conhecido e aceito: contas COMUNS logadas
-- (authenticated sem admin) passam a ler só peças publicadas —
-- antes liam tudo. Nenhum fluxo do site usa login de cliente:
-- a compradora é anônima e o painel exige admin.
--
-- Pré-requisito: schema.sql e politicas-rls.sql já aplicados.
--
-- Como usar: Supabase → SQL Editor → cole o arquivo inteiro → Run.
--
-- Idempotente: todo DROP POLICY IF EXISTS vem antes do CREATE —
-- rodar de novo não dá erro e não duplica nada.
--
-- Reversão (se algum dia for preciso): reaplicar as duas
-- políticas com USING (true), como em politicas-rls.sql.
-- ============================================================

-- ------------------------------------------------------------
-- TRANSAÇÃO — RODE O ARQUIVO INTEIRO DE UMA VEZ.
--    As duas políticas entram juntas ou nenhuma entra: se a
--    segunda falhar, o rollback desfaz tudo (sem estado
--    intermediário com produtos fechado e variações abertas,
--    que manteria o estoque de rascunhos legível).
--    O COMMIT vem logo após o segundo CREATE. Rodar só um
--    pedaço deixaria a transação — e os locks de DDL — abertos
--    até a sessão fechar.
-- ------------------------------------------------------------
begin;

-- ------------------------------------------------------------
-- 1) PRODUTOS — leitura pública
--    Anônimo e conta comum só leem peça PUBLICADA.
--    A administração não é afetada: o painel lê rascunhos pela
--    política escrita_admin_produtos (FOR ALL inclui SELECT),
--    que não depende de ativo.
-- ------------------------------------------------------------
drop policy if exists leitura_publica_produtos on public.produtos;

create policy leitura_publica_produtos
  on public.produtos
  for select
  to anon, authenticated
  using (ativo = true);

-- ------------------------------------------------------------
-- 2) VARIAÇÕES — leitura pública
--    A tabela NÃO tem coluna própria "ativo" (a publicação vive
--    no produto associado). O público só lê variações de peças
--    publicadas — mesma forma do item 1, conferida por
--    existência (índice idx_variacoes_produto apoia a busca).
-- ------------------------------------------------------------
drop policy if exists leitura_publica_variacoes on public.variacoes;

create policy leitura_publica_variacoes
  on public.variacoes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.produtos p
      where p.id = variacoes.produto_id
        and p.ativo = true
    )
  );

-- Fim da transação: as duas substituições foram aplicadas
-- (ou nenhuma, se algo falhou). A conferência abaixo roda
-- FORA da transação — valida o estado já confirmado, sem
-- manter nada aberto.
commit;

-- ============================================================
-- CONFERÊNCIA — SOMENTE LEITURA, pode rodar à vontade
-- (mesmo padrão da seção 6 de migracao-painel-1.sql)
-- ============================================================

-- Políticas vigentes nas duas tabelas.
-- Esperado: 4 linhas —
--   leitura_publica_produtos   (SELECT, anon+authenticated,
--                               qual com "ativo = true")
--   leitura_publica_variacoes  (SELECT, anon+authenticated,
--                               qual com EXISTS e "p.ativo = true")
--   escrita_admin_produtos     (ALL, authenticated, existe_admin
--                               — INALTERADA por este arquivo)
--   escrita_admin_variacoes    (ALL, authenticated, existe_admin
--                               — INALTERADA por este arquivo)
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('produtos', 'variacoes')
order by tablename, policyname;

-- RLS continua ligada nas duas tabelas.
-- Esperado: 2 linhas com rls_ativo = t.
select c.relname as tabela,
       c.relrowsecurity as rls_ativo
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('produtos', 'variacoes')
order by c.relname;
