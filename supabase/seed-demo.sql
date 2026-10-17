-- ============================================================
-- DONA SIL — ETAPA 3 (G4-B) — DADOS DEMO (FICTÍCIOS)
-- ============================================================
-- STATUS: AGUARDANDO REVISÃO. NÃO APLICAR SEM AUTORIZAÇÃO.
--
-- * TODOS os produtos aqui são FICTÍCIOS (demo = true).
--   São removidos na Etapa 10, quando você cadastra os reais.
-- * Preços, cores e fretes são INVENTADOS, só para testar o site.
-- * compras_ativas = false: enquanto estiver false, o SERVIDOR
--   recusa qualquer compra (modo demonstração).
-- * Este arquivo pode rodar DE NOVO com segurança:
--     - produtos que já existem são ignorados (on conflict do
--       nothing) e NÃO duplicam;
--     - o estoque atual das variações NÃO é mexido — o que os
--       testes alteraram permanece alterado;
--     - categorias, frete e configuração idem (ignorados).
--   Observação: se uma execução antiga foi interrompida no meio,
--   reexecutar não preenche o que faltou num produto que já
--   existia — nesse caso raro, apague o produto incompleto e
--   rode de novo.
--
-- PROPÓSITOS DE TESTE embarcados de propósito:
--   - Kimono Longo Palace: TODO estoque 0 => selo "Esgotado".
--   - Vestido Midi Florida, tamanho P Off-white: 0 => tamanho
--     esgotado dentro de um produto disponível.
--   - Acessórios usam tamanho "Único".
-- ============================================================

-- CONFIG: modo demo ligado (compras desativadas no servidor)
insert into public.configuracoes (chave, valor)
values ('compras_ativas', 'false'::jsonb)
on conflict (chave) do nothing;

-- CATEGORIAS
insert into public.categorias (nome, slug, ordem) values
  ('Vestidos',   'vestidos',   1),
  ('Blusas',     'blusas',     2),
  ('Saias',      'saias',      3),
  ('Kimonos',    'kimonos',    4),
  ('Acessórios', 'acessorios', 5)
on conflict do nothing;

-- FAIXAS DE FRETE (valores FICTÍCIOS — trocados na Etapa 10)
insert into public.faixas_frete (nome, valor, ordem) values
  ('Região Metropolitana do Recife (demo)', 15.00, 1),
  ('Interior de Pernambuco (demo)',         25.00, 2),
  ('Outros estados (demo)',                 39.90, 3)
on conflict do nothing;

-- ============================================================
-- PRODUTOS DEMO (20)
-- Cada bloco: cria o produto e suas variações (estoque).
-- ============================================================

-- 1) Vestido Midi Florida (destaque; variação P Off-white com 0)
with p as (
  insert into public.produtos (slug, nome, descricao, composicao, cuidados, preco, categoria_id, destaque, demo)
  select 'vestido-midi-florida', 'Vestido Midi Florida',
         'Estampa florida delicada, comprimento midi e caimento leve.',
         '100% viscose', 'Lavar à mão, secar à sombra',
         189.90, c.id, true, true
  from public.categorias c where c.slug = 'vestidos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Dourado',  '#cbb389', 1),
  ('M', 'Dourado',  '#cbb389', 2),
  ('G', 'Dourado',  '#cbb389', 1),
  ('P', 'Off-white','#f5efe6', 0),
  ('M', 'Off-white','#f5efe6', 1),
  ('G', 'Off-white','#f5efe6', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 2) Vestido Longo Bastião
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'vestido-longo-bastiao', 'Vestido Longo Bastião',
         'Longo fluido com alças ajustáveis, para festas e praia.',
         249.90, c.id, true
  from public.categorias c where c.slug = 'vestidos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('M', 'Areia',    '#d9c7a7', 2),
  ('G', 'Areia',    '#d9c7a7', 2),
  ('M', 'Terracota','#b4664c', 1),
  ('G', 'Terracota','#b4664c', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 3) Vestido Curto Julieta
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'vestido-curto-julieta', 'Vestido Curto Julieta',
         'Curto com babado, visual jovem e romântico.',
         159.90, c.id, true
  from public.categorias c where c.slug = 'vestidos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Preto', '#2b2420', 2),
  ('M', 'Preto', '#2b2420', 1),
  ('P', 'Marrom','#8a6a42', 1),
  ('M', 'Marrom','#8a6a42', 2)
) as t(tamanho, cor, cor_hex, qtd);

-- 4) Vestido Chemise Amália
with p as (
  insert into public.produtos (slug, nome, descricao, composicao, cuidados, preco, categoria_id, demo)
  select 'vestido-chemise-amalia', 'Vestido Chemise Amália',
         'Chemise com cinto, modelagem clássica que valoriza o corpo.',
         'Viscose e linho', 'Lavar à mão',
         179.90, c.id, true
  from public.categorias c where c.slug = 'vestidos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('M',  'Off-white','#f5efe6', 2),
  ('G',  'Off-white','#f5efe6', 1),
  ('GG', 'Off-white','#f5efe6', 1),
  ('M',  'Dourado',  '#cbb389', 1),
  ('G',  'Dourado',  '#cbb389', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 5) Vestido Midi Aurora
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'vestido-midi-aurora', 'Vestido Midi Aurora',
         'Midi com fenda lateral, elegante de dia e de noite.',
         199.90, c.id, true
  from public.categorias c where c.slug = 'vestidos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Terracota','#b4664c', 1),
  ('M', 'Terracota','#b4664c', 2),
  ('G', 'Terracota','#b4664c', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 6) Blusa Cetim Laço (destaque)
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, destaque, demo)
  select 'blusa-cetim-laco', 'Blusa Cetim Laço',
         'Cetim macio com laço frontal, toque de elegância.',
         89.90, c.id, true, true
  from public.categorias c where c.slug = 'blusas'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Champagne','#f5eddd', 2),
  ('M', 'Champagne','#f5eddd', 2),
  ('G', 'Champagne','#f5eddd', 1),
  ('P', 'Preto',    '#2b2420', 1),
  ('M', 'Preto',    '#2b2420', 2)
) as t(tamanho, cor, cor_hex, qtd);

-- 7) Blusa Alças Seda
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'blusa-alcas-seda', 'Blusa Alças Seda',
         'Alças finas com toque de seda, fresquinha para o calor.',
         99.90, c.id, true
  from public.categorias c where c.slug = 'blusas'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Dourado',  '#cbb389', 1),
  ('M', 'Dourado',  '#cbb389', 2),
  ('P', 'Off-white','#f5efe6', 2),
  ('M', 'Off-white','#f5efe6', 1),
  ('G', 'Off-white','#f5efe6', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 8) Camisa Linho Sol
with p as (
  insert into public.produtos (slug, nome, descricao, composicao, cuidados, preco, categoria_id, demo)
  select 'camisa-linho-sol', 'Camisa Linho Sol',
         'Linho levinho, modelagem soltinha e confortável.',
         '100% linho', 'Lavar à mão',
         119.90, c.id, true
  from public.categorias c where c.slug = 'blusas'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('M',  'Areia',    '#d9c7a7', 2),
  ('G',  'Areia',    '#d9c7a7', 2),
  ('GG', 'Areia',    '#d9c7a7', 1),
  ('M',  'Off-white','#f5efe6', 1),
  ('G',  'Off-white','#f5efe6', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 9) Blusa Ombro a Ombro
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'blusa-ombro-a-ombro', 'Blusa Ombro a Ombro',
         'Decote ombro a ombro com babado discreto.',
         94.90, c.id, true
  from public.categorias c where c.slug = 'blusas'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Terracota','#b4664c', 1),
  ('M', 'Terracota','#b4664c', 2),
  ('M', 'Preto',    '#2b2420', 2),
  ('G', 'Preto',    '#2b2420', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 10) Cropped Tricô Inverno
with p as (
  insert into public.produtos (slug, nome, descricao, cuidados, preco, categoria_id, demo)
  select 'cropped-trico-inverno', 'Cropped Tricô Inverno',
         'Tricô macio e curtinho, combina com saias altas.',
         'Não torcer, secar na horizontal',
         109.90, c.id, true
  from public.categorias c where c.slug = 'blusas'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Marrom',   '#8a6a42', 1),
  ('M', 'Marrom',   '#8a6a42', 2),
  ('P', 'Champagne','#f5eddd', 2),
  ('M', 'Champagne','#f5eddd', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 11) Saia Plissada Midi (destaque)
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, destaque, demo)
  select 'saia-plissada-midi', 'Saia Plissada Midi',
         'Plissada com elástico na cintura, caimento impecável.',
         129.90, c.id, true, true
  from public.categorias c where c.slug = 'saias'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Dourado','#cbb389', 2),
  ('M', 'Dourado','#cbb389', 2),
  ('G', 'Dourado','#cbb389', 1),
  ('P', 'Preto', '#2b2420', 1),
  ('M', 'Preto', '#2b2420', 2),
  ('G', 'Preto', '#2b2420', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 12) Saia Godê Flor
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'saia-gode-flor', 'Saia Godê Flor',
         'Godê com estampa floral, movimento no passo.',
         119.90, c.id, true
  from public.categorias c where c.slug = 'saias'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('M', 'Areia',    '#d9c7a7', 2),
  ('G', 'Areia',    '#d9c7a7', 1),
  ('M', 'Terracota','#b4664c', 1),
  ('G', 'Terracota','#b4664c', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 13) Saia Reta Tweep
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'saia-reta-tweep', 'Saia Reta Tweep',
         'Reta estruturada, tecido firme para look sério.',
         139.90, c.id, true
  from public.categorias c where c.slug = 'saias'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('M',  'Marrom','#8a6a42', 2),
  ('G',  'Marrom','#8a6a42', 1),
  ('GG', 'Marrom','#8a6a42', 1),
  ('M',  'Preto','#2b2420', 1),
  ('G',  'Preto','#2b2420', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 14) Saia Longa Chiffon
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'saia-longa-chiffon', 'Saia Longa Chiffon',
         'Longa fluida, leve com o vento.',
         149.90, c.id, true
  from public.categorias c where c.slug = 'saias'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Champagne','#f5eddd', 1),
  ('M', 'Champagne','#f5eddd', 2),
  ('M', 'Dourado', '#cbb389', 1),
  ('G', 'Dourado', '#cbb389', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 15) Kimono Estampado (destaque)
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, destaque, demo)
  select 'kimono-estampado', 'Kimono Estampado',
         'Aberto e fluido, transforma qualquer look básico.',
         149.90, c.id, true, true
  from public.categorias c where c.slug = 'kimonos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Dourado',  '#cbb389', 2),
  ('M', 'Dourado',  '#cbb389', 2),
  ('G', 'Dourado',  '#cbb389', 1),
  ('M', 'Off-white','#f5efe6', 1),
  ('G', 'Off-white','#f5efe6', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 16) Kimono Curto Bloom
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'kimono-curto-bloom', 'Kimono Curto Bloom',
         'Curto com bordado na barra, charme extra.',
         129.90, c.id, true
  from public.categorias c where c.slug = 'kimonos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Terracota','#b4664c', 1),
  ('M', 'Terracota','#b4664c', 1),
  ('M', 'Preto',    '#2b2420', 2),
  ('G', 'Preto',    '#2b2420', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 17) Kimono Longo Palace — TODO estoque 0 => testa o selo "Esgotado"
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'kimono-longo-palace', 'Kimono Longo Palace',
         'Longo com estampa sofisticada. (produto demo esgotado)',
         189.90, c.id, true
  from public.categorias c where c.slug = 'kimonos'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Dourado','#cbb389', 0),
  ('M', 'Dourado','#cbb389', 0),
  ('G', 'Dourado','#cbb389', 0),
  ('P', 'Marrom', '#8a6a42', 0),
  ('M', 'Marrom', '#8a6a42', 0)
) as t(tamanho, cor, cor_hex, qtd);

-- 18) Lenço Seda Flor (tamanho Único)
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'lenco-seda-flor', 'Lenço Seda Flor',
         'Estampado, use no pescoço ou amarrado na bolsa.',
         59.90, c.id, true
  from public.categorias c where c.slug = 'acessorios'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('Único', 'Dourado',  '#cbb389', 3),
  ('Único', 'Champagne','#f5eddd', 2)
) as t(tamanho, cor, cor_hex, qtd);

-- 19) Cinto Fivela Dourada
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'cinto-fivela-dourada', 'Cinto Fivela Dourada',
         'Cinto com fivela dourada, finaliza o look.',
         74.90, c.id, true
  from public.categorias c where c.slug = 'acessorios'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('P', 'Preto', '#2b2420', 2),
  ('M', 'Preto', '#2b2420', 2),
  ('G', 'Preto', '#2b2420', 1),
  ('M', 'Marrom','#8a6a42', 1)
) as t(tamanho, cor, cor_hex, qtd);

-- 20) Colar Contas Champagne (tamanho Único)
with p as (
  insert into public.produtos (slug, nome, descricao, preco, categoria_id, demo)
  select 'colar-contas-champagne', 'Colar Contas Champagne',
         'Colar de contas com brilho discreto.',
         69.90, c.id, true
  from public.categorias c where c.slug = 'acessorios'
  on conflict (slug) do nothing
  returning id
)
insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, t.tamanho, t.cor, t.cor_hex, t.qtd from p, (values
  ('Único', 'Champagne','#f5eddd', 3),
  ('Único', 'Dourado',  '#cbb389', 2)
) as t(tamanho, cor, cor_hex, qtd);
