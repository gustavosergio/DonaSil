/* eslint-disable @typescript-eslint/no-require-imports -- Rota real com rede isolada. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const { NextRequest } = require('next/server');
const arquivo = path.resolve(__dirname, '../src/app/api/admin/produtos/[slug]/route.ts');
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
const ambiente = { ...process.env };
const fetchOriginal = global.fetch;
async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://catalogo.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'ficticia';
  let temFoto = false;
  let gravacoes = 0;
  global.fetch = async (entrada, opcoes) => {
    const url = new URL(entrada);
    if (url.pathname.endsWith('/categorias')) return Response.json([{ id: id(2) }]);
    if (opcoes.method === 'GET') return Response.json([{ id: id(1), produto_cores: [{ produto_fotos: temFoto ? [{ caminho: 'foto-real.jpg' }] : [] }] }]);
    if (opcoes.method === 'PATCH') {
      gravacoes++;
      return Response.json([{ id: id(1), ...JSON.parse(opcoes.body) }]);
    }
    throw Error('Chamada inesperada');
  };
  const editar = (ativo, descricao, slug = 'calca-verde-dy7g_djoggj') => modulo.exports.PATCH(new NextRequest('http://localhost/api/admin/produtos/' + slug, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: 'donasil-painel-token=ficticio' },
    body: JSON.stringify({ nome: 'Calça verde', preco: 20, categoriaSlug: 'calcas', descricao, composicao: '', cuidados: '', ativo, destaque: false }),
  }), { params: Promise.resolve({ slug }) });
  assert.equal((await editar(false, '')).status, 200, 'Rascunho pode ser salvo sem foto');
  assert.equal((await editar(true, 'Calça verde tamanho G.')).status, 400, 'Sem foto não pode ativar');
  temFoto = true;
  assert.equal((await editar(true, '')).status, 400, 'Sem descrição não pode ativar');
  assert.equal(gravacoes, 1, 'Tentativas incompletas não podem gravar');
  assert.equal((await editar(true, 'Calça verde tamanho G.')).status, 200, 'Endereço importado com underscore pode ser editado');
  assert.equal((await editar(true, 'Descrição', '../fora')).status, 404);
  assert.equal(gravacoes, 2);
  console.log('Edição: rascunhos, fotos obrigatórias na ativação e endereços importados OK');
}
main().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => {
  global.fetch = fetchOriginal; process.env = ambiente;
});
