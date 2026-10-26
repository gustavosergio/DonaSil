/* eslint-disable @typescript-eslint/no-require-imports -- Servidor local de dados fictícios, sem acesso ao Supabase real. */
const http = require('node:http');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const categorias = [{ id: id(1), nome: 'Vestidos', slug: 'vestidos', ordem: 1 }];
const variacoes = [{ id: id(3), tamanho: 'P', cor: 'Off-white', cor_hex: '#f5f0e8', quantidade: 2 }];
const produto = {
  id: id(2), slug: 'vestido-floral', nome: 'Vestido Floral', preco: 120,
  descricao: 'Vestido leve para o dia a dia.', composicao: 'Algodão', cuidados: 'Lavar à mão',
  ativo: true, destaque: true, demo: false, fotos: [],
  categorias: categorias[0], variacoes, produto_cores: [],
};
const demo = { ...produto, id: id(4), slug: 'peca-demonstracao', nome: 'Peça de demonstração', demo: true };
const nomes = ['Recife — Zona Norte', 'Recife — Zona Sul', 'Região Metropolitana do Recife', 'Interior de Pernambuco', 'Outros estados', 'Retirada no local — endereço combinado pelo WhatsApp'];
const fretes = nomes.map((nome, i) => ({ id: id(10+i), nome, valor: [9.99,19.99,29.99,29.99,34.99,0][i], ativo: true, ordem: i+1 }));

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4010');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const responder = (dados, status=200) => { res.statusCode=status; res.end(JSON.stringify(dados)); };
  if (url.pathname === '/') return responder({ teste: true });
  if (url.pathname === '/rest/v1/rpc/existe_admin') return responder(req.headers.authorization === 'Bearer token-admin-ficticio');
  // Login falso exclusivo do servidor de testes. Não aceita nenhum dado real.
  if (url.pathname === '/auth/v1/token') {
    let corpo = '';
    for await (const parte of req) corpo += parte;
    const dados = JSON.parse(corpo || '{}');
    if (dados.email !== 'admin@example.invalid' || dados.password !== 'senha-ficticia-e2e') return responder({ error_code: 'invalid_credentials' }, 400);
    return responder({ access_token: 'token-admin-ficticio', refresh_token: 'renovacao-ficticia', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: 'bearer', user: { id: id(90), email: dados.email } });
  }
  if (url.pathname === '/auth/v1/logout') return responder({});
  if (url.pathname === '/rest/v1/variacoes' && req.method === 'PATCH') {
    if (req.headers.authorization !== 'Bearer token-admin-ficticio') return responder({}, 403);
    let corpo = '';
    for await (const parte of req) corpo += parte;
    const variacao = variacoes.find(v => `eq.${v.id}` === url.searchParams.get('id') && `eq.${v.quantidade}` === url.searchParams.get('quantidade'));
    if (!variacao) return responder([]);
    variacao.quantidade = JSON.parse(corpo).quantidade;
    return responder([{ id: variacao.id, quantidade: variacao.quantidade }]);
  }
  if (req.method !== 'GET') return responder({ erro: 'Escrita não implementada no servidor de testes' }, 405);
  if (url.pathname === '/rest/v1/categorias') return responder(categorias);
  if (url.pathname === '/rest/v1/variacoes') return responder(variacoes);
  if (url.pathname === '/rest/v1/faixas_frete') return responder(fretes);
  if (url.pathname === '/rest/v1/produtos') {
    let produtos = [produto, demo];
    if (url.searchParams.get('demo') === 'eq.false') produtos = produtos.filter(p=>!p.demo);
    if (url.searchParams.has('slug')) produtos = produtos.filter(p=>`eq.${p.slug}`===url.searchParams.get('slug'));
    const busca = url.searchParams.get('or');
    if (busca && !busca.toLowerCase().includes('floral')) produtos = [];
    return responder(produtos);
  }
  responder([], 200);
}).listen(4010, '127.0.0.1', () => console.log('Dados fictícios E2E em 127.0.0.1:4010'));
