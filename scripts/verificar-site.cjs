const assert = require('node:assert/strict'); // eslint-disable-line @typescript-eslint/no-require-imports
const { spawn } = require('node:child_process'); // eslint-disable-line @typescript-eslint/no-require-imports
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3002';
let servidor;
async function main() {
  if (process.argv.includes('--start')) {
    servidor = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3002'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error('Servidor não iniciou em 30 segundos')), 30000);
      servidor.stdout.on('data', (dados) => {
        if (dados.toString().includes('Ready')) { clearTimeout(limite); resolve(); }
      });
      servidor.once('error', (erro) => { clearTimeout(limite); reject(erro); });
      servidor.once('exit', (codigo) => { clearTimeout(limite); reject(new Error(`Servidor encerrou: ${codigo}`)); });
    });
  }
  for (const rota of ['/', '/catalogo', '/desapego', '/sacola', '/finalizar', '/robots.txt']) {
    const resposta = await fetch(`${base}${rota}`, {
      redirect: 'manual', signal: AbortSignal.timeout(30000),
    });
    assert.equal(resposta.status, 200, rota);
    const conteudo = await resposta.text();
    assert.ok(conteudo.length > 0, rota);
    if (rota === '/') {
      assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(resposta.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.ok(!conteudo.includes('Modo demonstração: nomes'), 'A versão de produção não deve exibir aviso de demonstração.');
    }
    console.log(`${rota}: HTTP 200`);
  }
  const admin = await fetch(`${base}/admin`, { redirect: 'manual' });
  assert.ok([302, 303, 307, 308].includes(admin.status));
  assert.ok(admin.headers.get('location')?.includes('/admin/login'));
  console.log('/admin: redireciona para login sem sessão');
  const escrita = await fetch(`${base}/api/admin/produtos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(escrita.status, 401, 'Cadastro de produto exige autenticação');
  console.log('/api/admin/produtos: bloqueia gravação sem sessão');
}
main().catch((erro) => { console.error(erro.message); process.exitCode = 1; })
  .finally(() => servidor?.kill());
