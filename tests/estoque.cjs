/* eslint-disable @typescript-eslint/no-require-imports -- Testa a rota com rede e autenticação isoladas. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const { NextRequest } = require('next/server');
const arquivo = path.resolve(__dirname, '../src/app/api/admin/estoque/[id]/route.ts');
const modulo = new Module(arquivo, module);
modulo.filename = arquivo;
modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
let papel = 'admin';
modulo.require = nome => nome === '@/lib/painel-auth'
  ? { COOKIE_TOKEN: 'donasil-painel-token', verificarAdminPainel: async () => papel }
  : module.require(nome);
modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, arquivo);
const id = '00000000-0000-4000-8000-000000000003';
function requisicao(dados, token=true) {
  return new NextRequest(`http://localhost/api/admin/estoque/${id}`, {
    method: 'PATCH', body: JSON.stringify(dados),
    headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: 'donasil-painel-token=ficticio' } : {}) },
  });
}
const contexto = { params: Promise.resolve({ id }) };
const originalFetch = global.fetch;
const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveOriginal = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://catalogo.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'chave-ficticia';
  let chamadas = 0;
  global.fetch = async (url, opcoes) => {
    chamadas++;
    const consulta = new URL(url);
    assert.equal(consulta.searchParams.get('id'), `eq.${id}`);
    assert.equal(consulta.searchParams.get('quantidade'), 'eq.2');
    assert.equal(opcoes.headers.Authorization, 'Bearer ficticio');
    assert.deepEqual(JSON.parse(opcoes.body), { quantidade: 3 });
    return Response.json([{ id, quantidade: 3 }]);
  };
  assert.equal((await modulo.exports.PATCH(requisicao({}, false), contexto)).status, 401);
  papel = 'comum';
  assert.equal((await modulo.exports.PATCH(requisicao({}), contexto)).status, 403);
  papel = 'admin';
  for (const quantidade of [-1, 0.5, 1000001, '3']) {
    assert.equal((await modulo.exports.PATCH(requisicao({ quantidade, quantidadeAnterior: 2 }), contexto)).status, 400);
  }
  assert.equal(chamadas, 0, 'Nenhuma recusa deve alterar o banco');
  const sucesso = await modulo.exports.PATCH(requisicao({ quantidade: 3, quantidadeAnterior: 2 }), contexto);
  assert.deepEqual(await sucesso.json(), { ok: true, quantidade: 3 });
  assert.equal(chamadas, 1);
  global.fetch = async () => Response.json([]);
  assert.equal((await modulo.exports.PATCH(requisicao({ quantidade: 3, quantidadeAnterior: 2 }), contexto)).status, 409);
  global.fetch = async () => { throw new Error('conexão interrompida'); };
  const incerto = await modulo.exports.PATCH(requisicao({ quantidade: 3, quantidadeAnterior: 2 }), contexto);
  assert.equal(incerto.status, 502);
  assert.match((await incerto.json()).mensagem, /confira a quantidade/);
  console.log('Estoque: sessão, permissão, validação, concorrência e falha de rede OK');
}
main().catch(e => { console.error(e); process.exitCode=1; }).finally(() => {
  global.fetch = originalFetch;
  if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal;
  if (chaveOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = chaveOriginal;
});
