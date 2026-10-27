-- ============================================================
-- DONA SIL — FRETES COMERCIAIS (tarifas fixas por região)
-- ============================================================
-- Substitui as três faixas de demonstração pelas tarifas
-- comerciais oficiais da loja. Aplicar no SQL Editor do Supabase;
-- idempotente (pode reaplicar sem risco).
--
-- Decisões registradas (planejamento aprovado):
--   * Tarifas FIXAS — não variam com o custo do serviço de
--     entrega; a loja absorve eventuais diferenças.
--   * Frete GRÁTIS para entregas quando o subtotal dos produtos é
--     estritamente maior que R$ 129,99 (R$ 129,99 paga; R$ 130,00
--     já é grátis). Regra aplicada no SERVIDOR do site
--     (src/lib/frete.ts) — este script só cadastra as tarifas.
--   * Retirada no local: gratuita em qualquer subtotal; o endereço
--     é combinado pelo WhatsApp e NUNCA é publicado no site.
--   * Nomes neutros: nenhum fornecedor logístico é citado.
--
-- NOMES CANÔNICOS: src/lib/frete.ts referencia exatamente estes
-- nomes (fail-closed). Renomear uma faixa aqui sem atualizar
-- aquele arquivo BLOQUEIA a finalização com erro claro — nunca
-- cobra um valor por aproximação. Para mudar uma tarifa, mude o
-- banco E as constantes JUNTOS.
--
-- Segurança: este script não toca em políticas RLS, privilégios
-- ou dados de produtos/pedidos — somente a tabela faixas_frete.
-- ============================================================

begin;

-- 1) Desativa as faixas de demonstração antigas (idempotente).
update public.faixas_frete
   set ativo = false
 where nome in ('Região Metropolitana do Recife (demo)',
                'Interior de Pernambuco (demo)',
                'Outros estados (demo)');

-- 2) Cadastra/atualiza as seis tarifas comerciais (nome é unique).
--    on conflict reativa e retifica execuções repetidas.
insert into public.faixas_frete (nome, valor, ordem) values
  ('Recife — Zona Norte',    14.99, 1),
  ('Recife — Zona Sul',     21.99, 2),
  ('Região Metropolitana do Recife', 29.99, 3),
  ('Interior de Pernambuco',        29.99, 4),
  ('Outros estados',                34.99, 5),
  ('Retirada no local — endereço combinado pelo WhatsApp', 0.00, 6)
on conflict (nome) do update
   set valor = excluded.valor,
       ordem = excluded.ordem,
       ativo = true;

commit;

-- 3) Verificação: devem existir seis faixas ativas, nesta ordem,
--    com exatamente estes valores.
select nome, valor, ativo, ordem
  from public.faixas_frete
 order by ordem;
