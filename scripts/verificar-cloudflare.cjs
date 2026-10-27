/* eslint-disable @typescript-eslint/no-require-imports -- Verifica o pacote Workers sem alterar o catálogo. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, devices } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const iniciar = process.argv.includes('--start');
const baseURL = iniciar ? 'http://127.0.0.1:3004' : process.env.TEST_BASE_URL || 'http://127.0.0.1:3004';
let servidor;

async function iniciarServidor() {
  servidor = spawn(process.execPath, ['node_modules/@opennextjs/cloudflare/dist/cli/index.js', 'preview', '--', '--port', '3004'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, SUPABASE_SECRET_KEY: '' },
  });
  await new Promise((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error('O runtime Cloudflare não iniciou em 60 segundos.')), 60_000);
    const ouvir = dados => {
      if (dados.toString().includes('Ready on')) { clearTimeout(limite); resolve(); }
    };
    servidor.stdout.on('data', ouvir);
    servidor.stderr.on('data', ouvir);
    servidor.once('error', erro => { clearTimeout(limite); reject(erro); });
    servidor.once('exit', codigo => { clearTimeout(limite); reject(new Error(`O runtime encerrou: ${codigo}`)); });
  });
}

async function main() {
  if (iniciar) await iniciarServidor();
  const http = spawnSync(process.execPath, ['scripts/verificar-site.cjs'], {
    windowsHide: true, stdio: 'inherit', env: { ...process.env, TEST_BASE_URL: baseURL },
  });
  assert.equal(http.status, 0, 'A verificação HTTP no runtime Workers falhou.');
  const browser = await chromium.launch();
  const pasta = path.resolve('.wrangler', 'conferencia-visual');
  await fs.mkdir(pasta, { recursive: true });
  try {
    for (const [nome, dispositivo] of [['computador', devices['Desktop Chrome']], ['celular', devices['Pixel 7']]]) {
      const contexto = await browser.newContext({ ...dispositivo, baseURL });
      const page = await contexto.newPage();
      const erros = [];
      page.on('pageerror', erro => erros.push(erro.message));
      await page.goto('/');
      await page.getByRole('heading', { name: 'Dona Sil', exact: true }).waitFor();
      // Aguarda o conteúdo dinâmico para também verificar a leitura do Supabase.
      await page.getByRole('heading', { name: 'Novidades', exact: true }).waitFor();
      await page.goto('/catalogo');
      await page.getByRole('searchbox').waitFor();
      const pecas = page.locator('main a[href^="/catalogo/"]');
      await pecas.first().waitFor();
      assert.ok(await pecas.count() > 0, 'O catálogo não carregou nenhuma peça.');
      await page.screenshot({ path: path.join(pasta, `catalogo-${nome}.png`), fullPage: true });
      assert.equal(await page.locator('html').evaluate(el => el.scrollWidth > el.clientWidth), false, 'Página com rolagem horizontal.');
      // Conferência somente de leitura: não envia mensagem nem registra pedido.
      await pecas.first().click();
      await page.getByRole('group', { name: 'Tamanho', exact: true }).locator('label').first().click();
      await page.locator('input[name="cor"]:enabled').first().locator('..').click();
      await page.getByRole('button', { name: 'Adicionar à sacola', exact: true }).click();
      await page.goto('/finalizar');
      await page.route('https://viacep.com.br/**', route => route.fulfill({
        json: { cep: '52000-000', logradouro: 'Rua de Teste', bairro: 'Bairro Teste', localidade: 'Recife', uf: 'PE' },
      }));
      await page.getByLabel('Nome completo').fill('Cliente de Verificação');
      await page.getByLabel('WhatsApp (com DDD)').fill('81999998888');
      await page.getByLabel('CEP', { exact: true }).fill('52000000');
      await page.getByLabel('Cidade', { exact: true }).fill('Recife');
      await page.getByLabel('Endereço (rua e número)').fill('Rua de Teste, 123');
      await page.getByLabel('UF', { exact: true }).fill('PE');
      await page.getByRole('radio', { name: /Retirada no local/ }).check();
      await page.getByRole('button', { name: 'Conferir e continuar', exact: true }).click();
      const enviar = page.getByRole('link', { name: 'Enviar pedido no WhatsApp', exact: true });
      await enviar.waitFor();
      const whatsapp = new URL(await enviar.getAttribute('href'));
      assert.equal(whatsapp.hostname, 'wa.me');
      assert.equal(whatsapp.pathname, '/5581999770114');
      assert.ok(!whatsapp.searchParams.get('text').includes('Rua de Teste'), 'Retirada expôs endereço.');
      await page.getByText('Seu pedido ainda NÃO foi registrado no site.', { exact: true }).waitFor();
      await page.goto('/catalogo');
      await page.getByRole('searchbox').fill('zzzz-inexistente');
      await page.getByRole('button', { name: 'Buscar', exact: true }).click();
      await page.getByText('Nenhuma peça encontrada').waitFor();
      await page.goto('/admin');
      await page.waitForURL(/\/admin\/login/);
      await page.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
      assert.deepEqual(erros, [], `Erros JavaScript no ${nome}`);
      console.log(`Workers/${nome}: catálogo, sacola, Server Action, retirada, WhatsApp, busca, layout e acesso ao painel OK.`);
      await contexto.close();
    }
  } finally {
    await browser.close();
  }
}
main().catch(erro => { console.error(erro.message); process.exitCode=1; }).finally(() => {
  if (!servidor?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(servidor.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  else servidor.kill();
});
