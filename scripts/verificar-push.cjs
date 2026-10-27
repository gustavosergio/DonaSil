/* eslint-disable @typescript-eslint/no-require-imports -- Verificação local antes de enviar ao GitHub. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const registro = path.resolve('.wrangler', 'verificacao-push.json');

function assinatura() {
  const arquivos = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const hash = crypto.createHash('sha256');
  for (const arquivo of [...new Set(arquivos)].sort()) {
    hash.update(arquivo); hash.update('\0');
    hash.update(fs.existsSync(arquivo) ? fs.readFileSync(arquivo) : '[removido]');
    hash.update('\0');
  }
  return hash.digest('hex');
}

function main() {
  const antes = assinatura();
  if (process.argv.includes('--usar-aprovacao') && fs.existsSync(registro)) {
    const anterior = JSON.parse(fs.readFileSync(registro, 'utf8'));
    if (anterior.assinatura === antes && Date.now() - anterior.data < 2 * 60 * 60 * 1000) {
      console.log('Pré-push: estes mesmos arquivos já passaram nas verificações.'); return;
    }
  }
  const npm = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ].find(candidato => candidato && fs.existsSync(candidato));
  if (!npm) throw new Error('Não foi possível localizar o npm para verificar o projeto.');
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', SUPABASE_SECRET_KEY: '', MELHOR_ENVIO_TOKEN: '' };
  for (const comando of [['test'], ['run', 'lint'], ['run', 'cloudflare:check'], ['exec', '--', 'tsc', '--noEmit'], ['run', 'test:e2e']]) {
    console.log(`Pré-push: npm ${comando.join(' ')}`);
    const resultado = spawnSync(process.execPath, [npm, ...comando], { stdio: 'inherit', env, windowsHide: true });
    if (resultado.error || resultado.status !== 0) throw new Error('Verificação falhou. O envio ao GitHub foi bloqueado para corrigir o projeto primeiro.');
  }
  if (assinatura() !== antes) throw new Error('Os arquivos mudaram durante a verificação. Execute novamente antes de enviar.');
  fs.mkdirSync(path.dirname(registro), { recursive: true });
  fs.writeFileSync(registro, JSON.stringify({ assinatura: antes, data: Date.now() }));
  console.log('Pré-push aprovado: testes, lint, compilação sem credenciais, tipos, pacote Cloudflare e navegador.');
}
try { main(); } catch (erro) { console.error(erro.message); process.exitCode = 1; }
