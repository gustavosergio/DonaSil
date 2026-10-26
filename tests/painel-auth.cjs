/* eslint-disable @typescript-eslint/no-require-imports -- Testa autenticação com respostas isoladas, sem credenciais reais. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const arquivo = path.resolve(__dirname, '../src/lib/painel-auth.ts');
const modulo = new Module(arquivo, module);
modulo.filename = arquivo;
modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, arquivo);
const originalFetch = global.fetch;
const ambiente = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, chave: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://auth.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'ficticia';
  const entrar = () => modulo.exports.entrarPainel('admin@example.invalid', 'ficticia');
  for (const status of [500, 502, 503]) {
    global.fetch = async () => Response.json({ error: 'unavailable' }, { status });
    assert.equal((await entrar()).resultado, 'conexao', `HTTP ${status} não deve ser tratado como senha incorreta`);
  }
  global.fetch = async () => Response.json({ error_code: 'invalid_credentials' }, { status: 400 });
  assert.equal((await entrar()).resultado, 'credenciais');
  global.fetch = async () => Response.json({}, { status: 429 });
  assert.equal((await entrar()).resultado, 'limite');
  global.fetch = async () => { throw new Error('offline'); };
  assert.equal((await entrar()).resultado, 'conexao');
  assert.equal(await modulo.exports.verificarAdminPainel('ficticio'), 'falha');
  console.log('Autenticação: indisponibilidade, credenciais e limite de tentativas OK');
}
main().catch(erro => { console.error(erro); process.exitCode = 1; }).finally(() => {
  global.fetch = originalFetch;
  for (const [nome, valor] of [['NEXT_PUBLIC_SUPABASE_URL', ambiente.url], ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', ambiente.chave]]) {
    if (valor === undefined) delete process.env[nome]; else process.env[nome] = valor;
  }
});
