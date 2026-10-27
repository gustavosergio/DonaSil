/* eslint-disable @typescript-eslint/no-require-imports -- Testa falhas dos provedores de CEP sem rede real. */
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const Module=require('node:module');
function carregar(nome){const arquivo=path.resolve('src/lib/'+nome+'.ts');const m=new Module(arquivo,module);m.filename=arquivo;m.paths=Module._nodeModulePaths(path.dirname(arquivo));m.require=n=>n==='./cep'?carregar('cep'):module.require(n);m._compile(ts.transpileModule(fs.readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,arquivo);return m.exports;}
const original=global.fetch;const ambiente={...process.env};
(async()=>{delete process.env.CEP_API_URL;const {consultarEnderecoServidor}=carregar('endereco-servidor');let chamadas=[];
 global.fetch=async url=>{chamadas.push(url);return url.includes('viacep')?Response.json({}, {status:403}):Response.json({cep:'01001000',street:'Praça da Sé',neighborhood:'Sé',city:'São Paulo',state:'SP'});};
 const resultado=await consultarEnderecoServidor('01001-000');assert.equal(resultado.ok,true);assert.equal(resultado.dados.endereco,'Praça da Sé');assert.equal(chamadas.length,2);
 chamadas=[];global.fetch=async url=>{chamadas.push(url);return Response.json({erro:true});};assert.equal((await consultarEnderecoServidor('00000000')).motivo,'nao_encontrado');assert.equal(chamadas.length,1);
 global.fetch=async url=>url.includes('viacep')?Promise.reject(Error('Rede indisponível')):Response.json({cep:'99999999',state:'SP',street:'Outra rua',city:'São Paulo'});assert.equal((await consultarEnderecoServidor('01001000')).ok,false);
 console.log('CEP servidor: provedor alternativo, inexistência e CEP divergente conferidos');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.fetch=original;process.env=ambiente;});
