import { expect, test, type Page } from "@playwright/test";

const errosDePagina = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const erros: string[] = [];
  errosDePagina.set(page, erros);
  page.on('pageerror', erro => erros.push(erro.message));
});
test.afterEach(async ({ page }) => {
  expect(errosDePagina.get(page), 'Erros JavaScript não tratados no navegador').toEqual([]);
});

test("painel mostra aviso quando o catálogo fica indisponível", async ({ page, request }) => {
  await page.goto('/admin/login');
  await page.getByLabel('E-mail', { exact: true }).fill('admin@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia-e2e');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  try {
    const falha = await request.post('http://127.0.0.1:4010/__test__/catalogo', { data: { falhar: true } });
    expect(falha.status()).toBe(200);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Olá! Este é o painel da Dona Sil.' })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os indicadores', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Produtos ativos/ })).toHaveCount(0);
    await page.goto('/admin/produtos/novo');
    await expect(page.getByText('Não foi possível preparar o cadastro', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar produto', exact: true })).toHaveCount(0);
  } finally {
    await request.post('http://127.0.0.1:4010/__test__/catalogo', { data: { falhar: false } });
  }
});

async function adicionarPeca(page: Page) {
  await page.goto("/catalogo/vestido-floral");
  await page.getByRole("radio", { name: "P", exact: true }).check();
  await page.getByRole("radio", { name: "Off-white", exact: true }).check();
  await page.getByRole("button", { name: "Adicionar à sacola" }).click();
  await expect(page.getByRole("status")).toContainText("Adicionado à sacola");
}

async function preencherEntrega(page: Page) {
  await page.route("https://viacep.com.br/**", route => route.fulfill({
    json: { cep: "52000-000", logradouro: "Rua de Teste", bairro: "Bairro Teste", localidade: "Recife", uf: "PE" },
  }));
  await page.getByLabel("Nome completo").fill("Cliente de Teste");
  await page.getByLabel("WhatsApp (com DDD)").fill("81999998888");
  await page.getByLabel("CEP", { exact: true }).fill("52000000");
  await expect(page.getByLabel("Cidade", { exact: true })).toHaveValue("Recife");
  await page.getByLabel("Endereço (rua e número)").fill("Rua de Teste, 123");
}

test("vitrine real, categorias e busca sem peças de demonstração", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dona Sil", exact: true })).toBeVisible();
  await expect(page.getByText("Fotos demonstrativas")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Vestido Floral", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("inicio.png"), fullPage: true });
  await page.getByRole("link", { name: "Vestidos", exact: true }).click();
  await expect(page).toHaveURL(/categoria=vestidos/);
  await expect(page.getByRole("heading", { name: "Vestido Floral", exact: true })).toBeVisible();
  await expect(page.getByText("Peça de demonstração")).toHaveCount(0);
  await page.getByRole("searchbox").fill("inexistente");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Nenhuma peça encontrada").filter({ visible: true })).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate(el => el.clientWidth));
});

test("link direto não abre produto de demonstração", async ({ page }) => {
  await page.goto("/catalogo/peca-demonstracao");
  await expect(page.getByRole("button", { name: "Adicionar à sacola" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Peça de demonstração" })).toHaveCount(0);
});

test("sacola persiste e confirma entrega com preços do servidor", async ({ page }) => {
  await adicionarPeca(page);
  await page.goto("/sacola");
  await page.reload();
  await expect(page.getByText("Vestido Floral", { exact: true })).toBeVisible();
  await page.goto("/finalizar");
  await preencherEntrega(page);
  await page.getByRole("radio", { name: /Recife — Zona Norte/ }).check();
  await page.getByRole("button", { name: "Conferir e continuar" }).click();
  await expect(page.getByRole("heading", { name: "Confira o seu pedido" })).toBeVisible();
  const link = page.getByRole("link", { name: "Enviar pedido no WhatsApp" });
  const destino = new URL((await link.getAttribute("href"))!);
  expect(destino.hostname).toBe("wa.me");
  expect(destino.pathname).toBe("/5581999770114");
  expect(destino.searchParams.get("text")).toContain("129,99");
  expect(destino.searchParams.get("text")).toContain("Rua de Teste, 123");
  await expect(page.getByText("Seu pedido ainda NÃO foi registrado no site.")).toBeVisible();
});

test("retirada é gratuita e não expõe endereço no link", async ({ page }) => {
  await adicionarPeca(page);
  await page.goto("/finalizar");
  await preencherEntrega(page);
  await page.getByRole("radio", { name: /Retirada no local/ }).check();
  await page.getByRole("button", { name: "Conferir e continuar" }).click();
  const link = page.getByRole("link", { name: "Enviar pedido no WhatsApp" });
  await expect(link).toBeVisible();
  const mensagem = new URL((await link.getAttribute("href"))!).searchParams.get("text")!;
  expect(mensagem).toContain("Grátis");
  expect(mensagem).not.toContain("Rua de Teste");
  expect(mensagem).toContain("120,00");
});

test("região incompatível é recusada no servidor", async ({ page }) => {
  await adicionarPeca(page);
  await page.goto("/finalizar");
  await preencherEntrega(page);
  await page.getByRole("radio", { name: /Outros estados/ }).check();
  await page.getByRole("button", { name: "Conferir e continuar" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "não corresponde ao estado informado" })).toBeVisible();
  await expect(page.getByLabel("Nome completo")).toHaveValue("Cliente de Teste");
  await expect(page.getByRole("radio", { name: /Outros estados/ })).toBeChecked();
  await expect(page.getByRole("link", { name: "Enviar pedido no WhatsApp" })).toHaveCount(0);
  await page.getByRole("radio", { name: /Recife — Zona Norte/ }).check();
  await page.getByRole("button", { name: "Conferir e continuar" }).click();
  await expect(page.getByRole("heading", { name: "Confira o seu pedido" })).toBeVisible();
});

test("painel exige sessão e login recusa dados inválidos", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  const resposta = await request.post("/api/admin/sessao", { data: { email: "invalido", senha: "" } });
  expect(resposta.status()).toBe(400);
  const semSessao = await request.post("/api/admin/produtos", { data: {} });
  expect(semSessao.status()).toBe(401);
  const cookieFalso = await request.get("/admin/produtos", { headers: { Cookie: "donasil-painel-token=invalido" }, maxRedirects: 0 });
  expect(cookieFalso.status()).toBe(307);
  expect(cookieFalso.headers().location).toContain("/admin/login");
});

test("login administrativo e ajuste de estoque sem sobrescrever alterações simultâneas", async ({ page }) => {
  await page.goto("/admin/login?proximo=/admin/produtos/vestido-floral");
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.invalid");
  await page.getByLabel("Senha", { exact: true }).fill("senha-ficticia-e2e");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/produtos\/vestido-floral/);
  const estoque = page.getByRole("spinbutton", { name: "Estoque P — Off-white" });
  await expect(estoque).toBeVisible();
  const anterior = Number(await estoque.inputValue());
  await estoque.fill(String(anterior + 1));
  await estoque.locator("..").getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText(`Estoque total`, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(estoque).toHaveValue(String(anterior + 1));
  await expect(estoque.locator("..").getByRole("button", { name: "Salvar", exact: true })).toBeDisabled();
  // Executa no navegador: em produção os cookies são Secure e o
  // contexto HTTP separado do Playwright não reproduz o loopback do Chromium.
  const ajustar = (dados: { quantidade: number; quantidadeAnterior: number }) => page.evaluate(async corpo => {
    const resposta = await fetch('/api/admin/estoque/00000000-0000-4000-8000-000000000003', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    });
    return resposta.status;
  }, dados);
  expect(await ajustar({ quantidade: anterior + 2, quantidadeAnterior: anterior })).toBe(409);
  expect(await ajustar({ quantidade: 2, quantidadeAnterior: anterior + 1 })).toBe(200);
  const abrirMenu = page.getByRole('button', { name: 'Abrir menu do painel' });
  if (await abrirMenu.isVisible()) {
    expect(await page.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await abrirMenu.click();
    await page.locator('#menu-painel').getByRole('button', { name: 'Sair do painel' }).click();
  } else {
    await page.getByRole('banner').getByRole('button', { name: 'Sair do painel' }).click();
  }
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/admin/produtos');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("preço alterado no navegador não muda o total e duas peças recebem frete grátis", async ({ page }) => {
  await adicionarPeca(page);
  await page.evaluate(() => {
    const chave = 'donasil:sacola:v1';
    const sacola = JSON.parse(localStorage.getItem(chave)!);
    sacola.itens[0].precoUnitario = 0.01;
    sacola.itens[0].quantidade = 2;
    localStorage.setItem(chave, JSON.stringify(sacola));
  });
  await page.goto('/finalizar');
  await preencherEntrega(page);
  await page.getByRole('radio', { name: /Recife — Zona Norte/ }).check();
  await page.getByRole('button', { name: 'Conferir e continuar' }).click();
  const link = page.getByRole('link', { name: 'Enviar pedido no WhatsApp' });
  await expect(link).toBeVisible();
  const mensagem = new URL((await link.getAttribute('href'))!).searchParams.get('text')!;
  expect(mensagem).toContain('240,00');
  expect(mensagem).toContain('Grátis');
  expect(mensagem).not.toContain('0,01');
});

test("mudança da sacola em outra aba bloqueia o resumo antigo", async ({ page, context }) => {
  await adicionarPeca(page);
  await page.goto('/finalizar');
  await preencherEntrega(page);
  await page.getByRole('button', { name: 'Conferir e continuar' }).click();
  const enviar = page.getByRole('link', { name: 'Enviar pedido no WhatsApp' });
  await expect(enviar).toBeVisible();
  const outra = await context.newPage();
  await outra.goto('/sacola');
  await outra.getByRole('button', { name: 'Aumentar quantidade de Vestido Floral' }).click();
  await expect(enviar).toHaveCount(0);
  await outra.close();
});

test("UF inexistente é recusada sem apagar os dados da cliente", async ({ page }) => {
  await adicionarPeca(page);
  await page.goto('/finalizar');
  await preencherEntrega(page);
  await page.getByLabel('UF', { exact: true }).fill('XX');
  await page.getByRole('radio', { name: /Outros estados/ }).check();
  await page.getByRole('button', { name: 'Conferir e continuar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Informe uma UF válida' })).toBeVisible();
  await expect(page.getByLabel('Nome completo')).toHaveValue('Cliente de Teste');
  await expect(page.getByLabel('UF', { exact: true })).toHaveValue('XX');
});

test("menu e tema funcionam e não há rolagem horizontal", async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'celular') {
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('navigation', { name: 'Navegação principal' }).filter({ visible: true }).getByRole('link', { name: 'Catálogo', exact: true }).click();
    await expect(page).toHaveURL(/\/catalogo/);
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Mudar para modo escuro' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('tema-escuro.png'), fullPage: true });
});
