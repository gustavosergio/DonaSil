/* eslint-disable @typescript-eslint/no-require-imports -- Exercita as rotas reais com rede isolada. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const { NextRequest } = require('next/server');
const arquivo = path.resolve(__dirname, '../src/app/api/admin/produtos/route.ts');
const modulo = new Module(arquivo, module);
modulo.filename = arquivo;
modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
modulo.require = nome => nome === '@/lib/painel-auth'
  ? { COOKIE_TOKEN: 'donasil-painel-token', verificarAdminPainel: async () => 'admin' }
  : module.require(nome);
modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, arquivo);
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const corpo = { nome: 'Vestido QA', preco: 129.99, categoriaSlug: 'vestidos', descricao: 'Teste isolado',
  composicao: '', cuidados: '', destaque: false,
  cores: [{ nome: 'Azul', hex: '#0000ff' }], tamanhos: [{ tamanho: 'P', quantidade: 2 }] };
const requisicao = dados => new NextRequest('http://localhost/api/admin/produtos', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'donasil-painel-token=ficticio' }, body: JSON.stringify(dados),
});
const originalFetch = global.fetch;
const ambiente = { ...process.env };
async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://catalogo.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'ficticia';
  for (const falhar of [false, true]) {
    const chamadas = [];
    global.fetch = async (url, opcoes) => {
      const tabela = new URL(url).pathname.split('/').pop();
      const metodo = opcoes.method;
      chamadas.push(`${metodo} ${tabela}`);
      if (tabela === 'categorias') return Response.json([{ id: id(1) }]);
      if (tabela === 'produtos' && metodo === 'GET') return Response.json([]);
      if (tabela === 'produtos' && metodo === 'POST') {
        const produto = JSON.parse(opcoes.body)[0];
        assert.equal(produto.demo, false);
        assert.equal(produto.preco, 129.99);
        return Response.json([{ id: id(2), slug: 'vestido-qa' }], { status: 201 });
      }
      if (tabela === 'produto_cores') return falhar
        ? Response.json({}, { status: 500 }) : Response.json([{ id: id(3), nome: 'Azul' }]);
      if (tabela === 'variacoes') {
        const variacoes = JSON.parse(opcoes.body);
        assert.equal(variacoes[0].cor_id, id(3));
        assert.equal(variacoes[0].quantidade, 2);
      }
      return new Response(null, { status: 204 });
    };
    const resposta = await modulo.exports.POST(requisicao(corpo));
    assert.equal(resposta.status, falhar ? 502 : 201);
    if (falhar) assert.equal(chamadas.at(-1), 'DELETE produtos', 'Cadastro parcial deve ser compensado');
    else assert.equal(chamadas.at(-1), 'POST variacoes');
    const total = chamadas.length;
    assert.equal((await modulo.exports.POST(requisicao({ ...corpo, preco: -1 }))).status, 400);
    assert.equal(chamadas.length, total, 'Cadastro inválido não deve chamar o banco');
  }
  console.log('Cadastro: produto, cores, variações, validação e compensação de falha parcial OK');
}
main().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => {
  global.fetch = originalFetch; process.env = ambiente;
});
