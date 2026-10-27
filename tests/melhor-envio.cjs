/* eslint-disable @typescript-eslint/no-require-imports -- Cotação com rede isolada e sem conta real. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const Module=require('node:module');
function carregar(nome){const arquivo=path.resolve('src/lib/'+nome+'.ts');const m=new Module(arquivo,module);m.filename=arquivo;m.paths=Module._nodeModulePaths(path.dirname(arquivo));m.require=n=>n==='./cep'?carregar('cep'):module.require(n);m._compile(ts.transpileModule(fs.readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,arquivo);return m.exports;}
const me=carregar('melhor-envio');const env={...process.env};const original=global.fetch;
(async()=>{
 delete process.env.MELHOR_ENVIO_TOKEN;assert.equal(me.cotacaoConfigurada(),false);await assert.rejects(()=>me.cotarCorreios('01001000',[]),/ainda não está disponível/);
 Object.assign(process.env,{MELHOR_ENVIO_TOKEN:'token-ficticio-exclusivo-teste',FRETE_CEP_ORIGEM:'52000000',MELHOR_ENVIO_CONTATO:'teste@example.invalid',FRETE_PESO_PECA_KG:'0.5',FRETE_ALTURA_PECA_CM:'5',FRETE_LARGURA_PECA_CM:'20',FRETE_COMPRIMENTO_PECA_CM:'30'});
 let corpo;let metodo;global.fetch=async(url,opts)=>{assert.equal(url,'https://melhorenvio.com.br/api/v2/me/shipment/calculate');metodo=opts.method;corpo=JSON.parse(opts.body);return Response.json([
 {id:1,name:'PAC',price:'10.00',custom_price:'14.99',custom_delivery_time:5,company:{name:'Correios'}},
 {id:2,name:'SEDEX',custom_price:'21.99',custom_delivery_time:2,company:{name:'Correios'}},
 {id:3,name:'Outra',custom_price:'1.00',custom_delivery_time:1,company:{name:'Outra empresa'}},
 {id:1,name:'Inválido',error:'Não atende o CEP',company:{name:'Correios'}}]);};
 const itens=[{variacaoId:'abc',precoUnitario:80,quantidade:2}];const opcoes=await me.cotarCorreios('01001-000',itens);assert.equal(metodo,'POST');assert.equal(opcoes.length,2);assert.equal(opcoes[0].valor,14.99,'Usa custom_price e não preço base');assert.equal(corpo.products[0].quantity,2);assert.equal(corpo.products[0].insurance_value,80);assert.deepEqual(corpo.to,{postal_code:'01001000'});assert.deepEqual(Object.keys(corpo).sort(),['from','options','products','services','to']);
 await assert.rejects(()=>me.cotarCorreios('invalido',itens),/CEP válido/);
 global.fetch=async()=>Response.json({token:'nao-expor'}, {status:401});await assert.rejects(()=>me.cotarCorreios('01001000',itens),/Não foi possível calcular/);
 global.fetch=async()=>Response.json([{id:1,name:'PAC',custom_price:'NaN',custom_delivery_time:5,company:{name:'Correios'}}]);await assert.rejects(()=>me.cotarCorreios('01001000',itens),/Não foi possível calcular/);
 console.log('Melhor Envio: configuração, preços personalizados, quantidade, serviços e falhas conferidos sem cotação real');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{process.env=env;global.fetch=original;});
