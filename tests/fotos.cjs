/* eslint-disable @typescript-eslint/no-require-imports -- Testa upload real com rede isolada. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const { NextRequest } = require('next/server');
function carregar(relativo) {
 const arquivo=path.resolve(relativo); const m=new Module(arquivo,module); m.filename=arquivo;m.paths=Module._nodeModulePaths(path.dirname(arquivo));
 m.require=n=>n==='@/lib/painel-auth'?{COOKIE_TOKEN:'donasil-painel-token',verificarAdminPainel:async()=> 'admin'}:n.startsWith('@/')?carregar('src/'+n.slice(2)+'.ts'):module.require(n);
 m._compile(ts.transpileModule(fs.readFileSync(arquivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,arquivo); return m.exports;
}
const rota=carregar('src/app/api/admin/fotos/route.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={...process.env};const original=global.fetch;
async function main(){
 process.env.NEXT_PUBLIC_SUPABASE_URL='http://catalogo.invalid';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='ficticia';
 let chamadas=[];let falhar=false;let conflito=false;
 global.fetch=async(entrada,opcoes)=>{
  const u=new URL(entrada);const tabela=u.pathname.split('/').pop();const corpo=typeof opcoes.body==='string'?JSON.parse(opcoes.body):null;
  chamadas.push({tabela,method:opcoes.method,corpo,params:u.searchParams});
  if(tabela==='produto_cores'&&opcoes.method==='GET')return Response.json([{id:id(1),produto_id:id(2),nome:'Única',cor_hex:'#808080',produtos:{slug:'teste'}}]);
  if(tabela==='variacoes'&&opcoes.method==='GET')return Response.json([{id:id(3),cor:'Única',cor_hex:'#808080'}]);
  if(tabela==='produto_cores'&&opcoes.method==='PATCH')return Response.json(conflito?[]:[{id:id(1)}]);
  if(tabela==='variacoes'&&opcoes.method==='PATCH'){if(falhar&&corpo.cor==='vermelho')return Response.json({}, {status:500});return Response.json([]);}
  if(tabela==='produto_fotos'&&opcoes.method==='GET')return Response.json([]);
  if(tabela==='produto_fotos'&&opcoes.method==='POST')return Response.json([{id:id(4),caminho:corpo[0].caminho}]);
  if(u.pathname.startsWith('/storage/'))return Response.json({});
  throw Error('Chamada inesperada');
 };
 async function enviar(nome,bytes=[255,216,255,0],sessao=true){const f=new FormData();f.append('corId',id(1));f.append('corNome',nome);f.append('arquivo',new File([new Uint8Array(bytes)],'foto.jpg'));return rota.POST(new NextRequest('http://localhost/api/admin/fotos',{method:'POST',headers:sessao?{Cookie:'donasil-painel-token=ficticio'}:{},body:f}));}
 assert.equal((await enviar('vermelho',undefined,false)).status,401);assert.equal(chamadas.length,0);
 assert.equal((await enviar('')).status,400);assert.equal(chamadas.length,0);
 assert.equal((await enviar('x'.repeat(41))).status,400);assert.equal(chamadas.length,0);
 assert.equal((await enviar('vermelho',[1,2,3])).status,415);assert.equal(chamadas.length,0);
 assert.equal((await enviar('vermelho')).status,201);
 for(const t of ['produto_cores','variacoes'])assert.ok(chamadas.some(c=>c.tabela===t&&c.corpo?.[t==='produto_cores'?'nome':'cor']==='vermelho'));
 assert.ok(chamadas.filter(c=>c.method==='PATCH').every(c=>!Object.hasOwn(c.corpo,'quantidade')),'Mudar a cor não altera o estoque');
 chamadas=[];falhar=true;assert.equal((await enviar('vermelho')).status,502);
 assert.ok(chamadas.some(c=>c.tabela==='produto_cores'&&c.corpo?.nome==='Única'),'Restaura nome após falha');assert.ok(!chamadas.some(c=>c.method==='POST'),'Falha não envia foto');
 chamadas=[];falhar=false;conflito=true;assert.equal((await enviar('vermelho')).status,409);assert.ok(!chamadas.some(c=>c.method==='POST'));
 console.log('Fotos: cor por texto, upload, validação, autorização, estoque preservado e compensação OK');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{global.fetch=original;process.env=env;});
