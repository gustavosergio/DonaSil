process.loadEnvFile('.env.local');
function valor(nome) {
  return process.env[nome];
}
async function main() {
  const url = valor('NEXT_PUBLIC_SUPABASE_URL');
  const chave = valor('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !chave) throw new Error('Configuração pública ausente');
  if (new URL(url).hostname !== 'ymvbjrwywncfdysdxgqi.supabase.co') {
    throw new Error('A URL local não corresponde ao projeto informado');
  }
  for (const [tabela, select] of [
    ['produtos', 'id,demo,ativo'],
    ['faixas_frete', 'nome,valor,ativo,ordem'],
  ]) {
    const resposta = await fetch(`${url}/rest/v1/${tabela}?select=${select}`, {
      headers: { apikey: chave }, signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) throw new Error(`Leitura de ${tabela}: HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (tabela === 'produtos') {
      console.log(JSON.stringify({ tabela, total: dados.length,
        demonstracao: dados.filter((p) => p.demo).length,
        reaisAtivos: dados.filter((p) => p.ativo && !p.demo).length }));
    } else console.log(JSON.stringify({ tabela, faixas: dados }));
  }
}
main().catch((erro) => { console.error(erro.message); process.exitCode = 1; });
