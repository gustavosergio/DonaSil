/* eslint-disable @typescript-eslint/no-require-imports -- Impede incluir arquivos locais ou a chave administrativa no pacote. */
const fs = require('node:fs');
const path = require('node:path');
if (fs.existsSync('.env.local')) {
  // Lê apenas para comparar em memória. Nunca imprime valores de ambiente.
  const { parseEnv } = require('node:util');
  const local = parseEnv(fs.readFileSync('.env.local', 'utf8'));
  if (local.SUPABASE_SECRET_KEY) process.env.DONASIL_SEGREDO_VERIFICAR = local.SUPABASE_SECRET_KEY;
}
const segredo = process.env.DONASIL_SEGREDO_VERIFICAR || process.env.SUPABASE_SECRET_KEY;
const base = path.resolve('.open-next');
if (!fs.existsSync(path.join(base, 'worker.js'))) throw new Error('O pacote Cloudflare ainda não foi compilado.');
let arquivos = 0;
function verificar(pasta) {
  for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
    const arquivo = path.join(pasta, entrada.name);
    if (entrada.isSymbolicLink()) throw new Error('O pacote final contém um vínculo inesperado.');
    if (entrada.isDirectory()) { verificar(arquivo); continue; }
    if (/^\.env(?:\.|$)|^\.dev\.vars$|^backup\.json$/i.test(entrada.name)) throw new Error('Arquivo local de ambiente ou backup encontrado no pacote.');
    const conteudo = fs.readFileSync(arquivo);
    if (segredo && conteudo.includes(Buffer.from(segredo))) throw new Error('Chave administrativa detectada no pacote. A publicação foi bloqueada.');
    arquivos++;
  }
}
verificar(base);
console.log(`Pacote Cloudflare conferido: ${arquivos} arquivos, sem ambiente local ou chave administrativa.`);
