/* eslint-disable @typescript-eslint/no-require-imports -- Executor CommonJS para transpilar módulos isolados. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

// Compila apenas os módulos puros, sem depender do servidor Next.
function carregar(nome) {
  const arquivo = path.resolve(__dirname, '../src/lib', `${nome}.ts`);
  const codigo = ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = new Module(arquivo, module);
  modulo.filename = arquivo;
  modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
  modulo._compile(codigo, arquivo);
  return modulo.exports;
}

const frete = carregar('frete');
const pedido = carregar('pedido');
const cep = carregar('cep');
const tarifas = [
  [frete.FAIXA_ZONA_NORTE, 9.99],
  [frete.FAIXA_ZONA_SUL, 19.99],
  [frete.FAIXA_RMR, 29.99],
  [frete.FAIXA_INTERIOR_PE, 29.99],
  [frete.FAIXA_OUTROS_ESTADOS, 34.99],
  [frete.FAIXA_RETIRADA_NO_LOCAL, 0],
];
for (const [nome, valor] of tarifas) {
  const faixa = { id: '00000000-0000-4000-8000-000000000001', nome, valor };
  for (const subtotal of [12998, 12999]) {
    assert.equal(frete.calcularFreteAplicado(subtotal, faixa).valor, valor);
  }
  for (const subtotal of [13000, 50000]) {
    assert.equal(frete.calcularFreteAplicado(subtotal, faixa).valor, 0);
  }
  assert.equal(frete.faixaConhecida(nome), true);
}
assert.equal(frete.regiaoCompativelComUf(frete.FAIXA_ZONA_NORTE, 'PE'), true);
assert.equal(frete.regiaoCompativelComUf(frete.FAIXA_ZONA_NORTE, 'SP'), false);
assert.equal(frete.regiaoCompativelComUf(frete.FAIXA_OUTROS_ESTADOS, 'PE'), false);
assert.equal(frete.regiaoCompativelComUf(frete.FAIXA_OUTROS_ESTADOS, 'RJ'), true);
assert.equal(frete.regiaoCompativelComUf('Região desconhecida', 'PE'), false);
assert.equal(frete.regiaoCompativelComUf(frete.FAIXA_RETIRADA_NO_LOCAL, 'AC'), true);
const schemaCep = pedido.dadosEntregaSchema.shape.cep;
const schemaUf = pedido.dadosEntregaSchema.shape.uf;
for (const uf of ['PE', 'sp', ' DF ']) assert.equal(schemaUf.safeParse(uf).success, true);
for (const uf of ['XX', 'ZZ', '', 'P', 'PERNAMBUCO']) assert.equal(schemaUf.safeParse(uf).success, false);
for (const valor of ['52000-000', '52000000']) assert.equal(schemaCep.safeParse(valor).success, true);
for (const valor of ['', '5200', '52000-00', '52000-0a0', '52000-0000']) {
  assert.equal(schemaCep.safeParse(valor).success, false);
}
assert.deepEqual(cep.respostaParaCampos({ erro: 'true' }), { ok: false, motivo: 'nao_encontrado' });
assert.deepEqual(cep.respostaParaCampos({ erro: true }), { ok: false, motivo: 'nao_encontrado' });
assert.deepEqual(cep.respostaParaCampos({ uf: 'inválida' }), { ok: false, motivo: 'falha' });
const resumo = {
  itens: [], subtotal: 130, total: 130, retirada: true,
  frete: { nome: frete.FAIXA_RETIRADA_NO_LOCAL, valor: 0 },
  entrega: { nome: 'Cliente Teste', whatsapp: '81999998888', cep: '52000-000',
    endereco: 'ENDERECO_PRIVADO_TESTE', bairro: 'Bairro', cidade: 'Recife', uf: 'PE', complemento: '' },
};
const mensagem = pedido.montarMensagemWhatsApp(resumo);
assert.match(mensagem, /Grátis/);
assert.match(mensagem, /Retirada no local — endereço a combinar/);
assert.equal(mensagem.includes('ENDERECO_PRIVADO_TESTE'), false);
console.log('Regras de frete, CEP e privacidade da retirada: OK');
