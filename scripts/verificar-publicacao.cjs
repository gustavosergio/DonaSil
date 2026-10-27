/* eslint-disable @typescript-eslint/no-require-imports -- Auditoria de leitura, sem chaves no relatório. */
const { existsSync } = require('node:fs');
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) throw new Error('Configure a URL e a chave publicável do Supabase.');
  if (new URL(url).protocol !== 'https:') throw new Error('Use HTTPS para o catálogo real.');
  if (process.env.NEXT_PUBLIC_MODO_DEMO && process.env.NEXT_PUBLIC_MODO_DEMO !== 'false') throw new Error('Desative NEXT_PUBLIC_MODO_DEMO antes de publicar.');
  if (chave.startsWith('sb_secret_')) throw new Error('A configuração pública não pode usar uma chave secreta.');
  if (chave.split('.').length === 3) {
    const papel = JSON.parse(Buffer.from(chave.split('.')[1], 'base64url').toString()).role;
    if (papel !== 'anon') throw new Error('Use uma chave publicável ou anon na configuração pública.');
  }
  const consultar = async (tabela, params) => {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?${new URLSearchParams(params)}`, {
      headers: { apikey: chave }, signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) throw new Error(`Leitura de ${tabela}: HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (!Array.isArray(dados)) throw new Error(`Formato inesperado em ${tabela}.`);
    return dados;
  };
  const produtos = await consultar('produtos', {
    select: 'slug,nome,preco,descricao,destaque,variacoes(tamanho,cor,quantidade),produto_cores(produto_fotos(caminho))',
    ativo: 'eq.true', demo: 'eq.false',
  });
  const pendencias = [];
  if (!produtos.length) pendencias.push('Nenhum produto real ativo.');
  for (const produto of produtos) {
    const problemas = [];
    if (/\b(teste|test|demo|exemplo)\b/i.test(produto.nome)) problemas.push('nome de teste');
    if (!produto.descricao?.trim()) problemas.push('sem descrição');
    if (!(produto.preco > 0)) problemas.push('preço inválido');
    if (!produto.variacoes?.length) problemas.push('sem tamanhos/cores');
    if (produto.variacoes?.some(v => !Number.isInteger(v.quantidade) || v.quantidade < 0)) problemas.push('estoque inválido');
    const fotos = (produto.produto_cores || []).flatMap(c => c.produto_fotos || []);
    if (!fotos.length) problemas.push('sem foto');
    for (const foto of fotos) {
      const caminho = foto.caminho.split('/').map(encodeURIComponent).join('/');
      const resposta = await fetch(`${url}/storage/v1/object/public/fotos-produtos/${caminho}`, {
        method: 'HEAD', signal: AbortSignal.timeout(15_000),
      });
      if (!resposta.ok || !resposta.headers.get('content-type')?.startsWith('image/')) problemas.push('foto indisponível');
    }
    if (problemas.length) pendencias.push(`${produto.nome} (${produto.slug}): ${problemas.join(', ')}.`);
  }
  if (!produtos.some(p => p.destaque && p.variacoes?.some(v => v.quantidade > 0))) pendencias.push('Nenhuma peça real disponível marcada como destaque para a página inicial.');
  const fretes = await consultar('faixas_frete', { select: 'nome,valor', ativo: 'eq.true' });
  if (!fretes.length) pendencias.push('Nenhuma faixa de entrega ativa.');
  if (fretes.some(f => !Number.isFinite(f.valor) || f.valor < 0)) pendencias.push('Frete com valor inválido.');
  const inativos = await consultar('produtos', { select: 'id', ativo: 'eq.false', limit: '1' });
  if (inativos.length) pendencias.push('A leitura pública permite acessar um produto inativo. Revise as políticas do banco.');
  const demonstracao = await consultar('produtos', { select: 'id', ativo: 'eq.true', demo: 'eq.true', limit: '1' });
  if (demonstracao.length) pendencias.push('Ainda há produto de demonstração ativo.');
  for (const [tabela, campo] of [['pedidos', 'id'], ['admin_usuarios', 'user_id']]) {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?select=${campo}&limit=1`, { headers: { apikey: chave }, signal: AbortSignal.timeout(15000) });
    if (resposta.ok) {
      const registros = await resposta.json();
      if (!Array.isArray(registros) || registros.length) pendencias.push(`A leitura pública de ${tabela} precisa ser bloqueada.`);
    } else if (![401, 403, 404].includes(resposta.status)) pendencias.push(`Não foi possível verificar a proteção de ${tabela}.`);
  }
  console.log(`Produtos reais ativos: ${produtos.length}. Faixas de entrega: ${fretes.length}.`);
  for (const pendencia of pendencias) console.log(`PENDENTE: ${pendencia}`);
  if (!pendencias.length) console.log('Conferência aprovada: catálogo real, fotos acessíveis, fretes válidos e leitura privada protegida. Estoque atualizado manualmente no painel.');
  if (pendencias.length && process.argv.includes('--exigir-pronto')) process.exitCode = 1;
}
main().catch(erro => { console.error(erro.message); process.exitCode = 1; });
