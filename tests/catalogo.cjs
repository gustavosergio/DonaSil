/* eslint-disable @typescript-eslint/no-require-imports -- Teste isolado das consultas públicas. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

async function verificar(modoDemo) {
  const arquivo = path.resolve(__dirname, '../src/lib/catalogo.ts');
  const modulo = new Module(arquivo, module);
  modulo.filename = arquivo;
  modulo.paths = Module._nodeModulePaths(path.dirname(arquivo));
  modulo.require = (nome) => {
    if (nome === '@/lib/site') return { MODO_DEMO: modoDemo };
    if (nome === '@/lib/fotos') return { urlPublicaFoto: caminho => `https://catalogo.invalid/fotos/${caminho}` };
    if (nome === 'react') return { cache: (fn) => fn };
    return module.require(nome);
  };
  modulo._compile(ts.transpileModule(fs.readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, arquivo);
  const consultas = [];
  const cores = [
    { ordem: 1, produto_fotos: [{ caminho: 'ultima.jpg', ordem: 0 }] },
    { ordem: 0, produto_fotos: [{ caminho: 'segunda.jpg', ordem: 1 }, { caminho: 'capa.jpg', ordem: 0 }, { caminho: 'capa.jpg', ordem: 2 }] },
  ];
  const antes = JSON.stringify(cores);
  assert.deepEqual(modulo.exports.fotosDaGaleria(cores), ['capa.jpg', 'segunda.jpg', 'ultima.jpg'].map(foto => `https://catalogo.invalid/fotos/${foto}`));
  assert.equal(JSON.stringify(cores), antes, 'Ordenação não deve alterar os registros recebidos');
  assert.deepEqual(modulo.exports.fotosDaGaleria([]), []);
  global.fetch = async (url) => {
    consultas.push(new URL(url));
    return new Response('[]', { status: 200 });
  };
  await modulo.exports.listarProdutos();
  await modulo.exports.listarProdutos({ categoria: 'vestidos', busca: 'floral' });
  await modulo.exports.listarDestaques();
  assert.equal(await modulo.exports.obterProduto('peca-demo'), null);
  await modulo.exports.listarProdutos({ secao: 'moda' });
  await modulo.exports.listarProdutos({ secao: 'desapego' });
  assert.deepEqual(await modulo.exports.listarProdutos({ secao: 'moda', categoria: 'desapego' }), []);
  assert.equal(consultas.length, 6);
  assert.equal(consultas[2].searchParams.get('categorias.slug'), 'neq.desapego');
  assert.equal(consultas[4].searchParams.get('categorias.slug'), 'neq.desapego');
  assert.equal(consultas[5].searchParams.get('categorias.slug'), 'eq.desapego');
  for (const indice of [2, 4, 5]) assert.match(consultas[indice].searchParams.get('select'), /categorias!inner/);
  for (const consulta of consultas) {
    assert.equal(consulta.searchParams.get('ativo'), 'eq.true');
    assert.equal(consulta.searchParams.get('demo'), modoDemo ? null : 'eq.false');
  }
  assert.equal(consultas[1].searchParams.get('categorias.slug'), 'eq.vestidos');
  assert.equal(consultas[2].searchParams.get('destaque'), 'eq.true');
  assert.equal(consultas[3].searchParams.get('slug'), 'eq.peca-demo');
  await modulo.exports.listarProdutos({ secao: 'moda', categorias: ['vestidos', 'blusas', 'vestidos'], busca: 'floral' });
  assert.equal(consultas[6].searchParams.get('categorias.slug'), 'in.(vestidos,blusas)');
  assert.ok(consultas[6].searchParams.get('or').includes('floral'));
  await modulo.exports.listarProdutos({ secao: 'moda', categorias: ['desapego', 'vestidos'] });
  assert.equal(consultas[7].searchParams.get('categorias.slug'), 'eq.vestidos');
  assert.deepEqual(await modulo.exports.listarProdutos({ categorias: ['vestidos),demo.eq.true'] }), []);
  assert.equal(consultas.length, 8);
}

const fetchOriginal = global.fetch;
const ambienteOriginal = { ...process.env };
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://catalogo.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'chave-ficticia';
Promise.resolve().then(() => verificar(true)).then(() => verificar(false))
  .then(() => console.log('Catálogo: filtros de demonstração, busca e detalhes OK'))
  .catch((erro) => { console.error(erro); process.exitCode = 1; })
  .finally(() => { global.fetch = fetchOriginal; process.env = ambienteOriginal; });
