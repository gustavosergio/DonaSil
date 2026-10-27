/* eslint-disable @typescript-eslint/no-require-imports -- Confere finalização com serviços isolados. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const Module=require('node:module');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
let cidade='Recife';let rua='Rua de Teste';let preco=80;
function carregar(relativo){const arquivo=path.resolve(relativo);const m=new Module(arquivo,module);m.filename=arquivo;m.paths=Module._nodeModulePaths(path.dirname(arquivo));m.require=n=>{
 if(n==='@/lib/catalogo')return {CatalogoErro:class extends Error{},obterProduto:async()=>({slug:'teste',nome:'Peça',preco,categoriaSlug:'calcas',variacoes:[{id:id(1),tamanho:'G',cor:'Azul',quantidade:1}]})};
 if(n==='@/lib/endereco-servidor')return {consultarEnderecoServidor:async()=>({ok:true,dados:{endereco:rua,bairro:'Bairro Teste',cidade,uf:'PE'}})};
 if(n==='@/lib/whatsapp')return {linkWhatsApp:m=>'https://wa.me/5581999770114?text='+encodeURIComponent(m)};
 if(n==='@/lib/frete'){const f=carregar('src/lib/frete.ts');return {...f,listarFaixasFrete:async()=>[{id:id(2),nome:f.FAIXA_ZONA_NORTE,valor:14.99},{id:f.FAIXA_COTACAO_ID,nome:f.FAIXA_COTACAO,valor:0}]};}
 if(n==='./cep')return carregar('src/lib/cep.ts');
 if(n.startsWith('@/'))return carregar('src/'+n.slice(2)+'.ts');return module.require(n);
};m._compile(ts.transpileModule(fs.readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,arquivo);return m.exports;}
const {prepararPedido,cotarFretePedido}=carregar('src/app/finalizar/actions.ts');
async function enviar(mudancas={}){const f=new FormData();const dados={itens:JSON.stringify([{variacaoId:id(1),produtoSlug:'teste',quantidade:1}]),nome:'Cliente Teste',whatsapp:'81999998888',cep:'52000000',endereco:'Rua de Teste',numero:'123',complemento:'',bairro:'Bairro Teste',cidade:'Recife',uf:'PE',faixaFreteId:id(2),...mudancas};for(const [k,v]of Object.entries(dados))f.set(k,v);return prepararPedido(null,f);}
(async()=>{
 const ok=await enviar();assert.equal(ok.ok,true);assert.equal(ok.resumo.total,94.99);assert.match(ok.resumo.mensagemWhatsApp,/Rua de Teste, 123/);
 assert.equal((await enviar({numero:''})).ok,false);
 const adulterado=await enviar({endereco:'Rua adulterada'});assert.equal(adulterado.ok,false);assert.match(adulterado.errosCampos.cep,/não corresponde/);
 cidade='Olinda';const fora=await enviar({cidade:'Olinda'});assert.equal(fora.ok,false);assert.match(fora.errosCampos.faixaFreteId,/só pode ser usada/);
 const externo='00000000-0000-4000-8000-000000000099';
 const pendente=await enviar({cidade:'Olinda',faixaFreteId:externo,freteCotado:'0',servicoFrete:'1'});assert.equal(pendente.ok,false);assert.match(pendente.errosCampos.faixaFreteId,/ainda não está disponível/);
 const formulario=new FormData();formulario.set('cep','52000000');formulario.set('itens',JSON.stringify([{variacaoId:id(1),produtoSlug:'teste',quantidade:1}]));
 assert.equal((await cotarFretePedido(formulario)).ok,false);
 preco=130;const promocao=await enviar({cidade:'Olinda',faixaFreteId:externo});assert.equal(promocao.ok,true);assert.equal(promocao.resumo.frete.valor,0);assert.equal(promocao.resumo.total,130);assert.equal((await cotarFretePedido(formulario)).opcoes[0].valor,0);
 cidade='Recife';rua='';assert.equal((await enviar()).ok,false);
 console.log('Entrega: número separado, CEP validado no servidor, Recife e adulteração conferidos');
})().catch(e=>{console.error(e);process.exitCode=1;});
