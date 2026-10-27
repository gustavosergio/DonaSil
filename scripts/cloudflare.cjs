/* eslint-disable @typescript-eslint/no-require-imports -- Comandos de hospedagem com argumentos separados e sem shell. */
const { spawnSync } = require('node:child_process');
const modo = process.argv[2] || 'build';
if (!['build', 'check', 'preview', 'deploy'].includes(modo)) throw new Error('Comando Cloudflare inválido.');
if (process.env.DONASIL_DIST_DIR) throw new Error('Remova DONASIL_DIST_DIR antes de gerar o pacote da hospedagem.');
const env = { ...process.env, SUPABASE_SECRET_KEY: '' };
function executar(arquivo, argumentos) {
  const resultado = spawnSync(process.execPath, [arquivo, ...argumentos], { stdio: 'inherit', env, windowsHide: true });
  if (resultado.error) throw new Error('Não foi possível iniciar a ferramenta de hospedagem.');
  if (resultado.status !== 0) process.exit(resultado.status || 1);
}
if (modo === 'deploy') executar('scripts/verificar-publicacao.cjs', ['--exigir-pronto']);
executar('node_modules/@opennextjs/cloudflare/dist/cli/index.js', ['build']);
executar('scripts/verificar-pacote-cloudflare.cjs', []);
if (modo === 'check') executar('node_modules/wrangler/bin/wrangler.js', ['deploy', '--dry-run', '--outdir', '.wrangler/verificacao']);
if (modo === 'preview') executar('node_modules/@opennextjs/cloudflare/dist/cli/index.js', ['preview']);
if (modo === 'deploy') executar('node_modules/@opennextjs/cloudflare/dist/cli/index.js', ['deploy', '--', '--keep-vars']);
