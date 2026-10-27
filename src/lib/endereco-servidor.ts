import { normalizarCep, respostaParaCampos, type ResultadoCep } from "./cep";

/** Consulta independente no servidor: campos bloqueados no navegador não são prova do endereço. */
export async function consultarEnderecoServidor(cep: string): Promise<ResultadoCep> {
  const normalizado = normalizarCep(cep);
  if (!normalizado) return { ok: false, motivo: "nao_encontrado" };
  const base = process.env.CEP_API_URL ?? "https://viacep.com.br/ws";
  try {
    const resposta = await fetch(`${base}/${normalizado}/json/`, {
      cache: "no-store", signal: AbortSignal.timeout(3_000),
    });
    if (resposta.ok) {
      const resultado = respostaParaCampos(await resposta.json());
      if (resultado.ok || resultado.motivo === "nao_encontrado") return resultado;
    }
  } catch {
    // Uma falha de rede não deve depender de um único provedor de CEP.
  }
  if (process.env.CEP_API_URL) return { ok: false, motivo: "falha" };
  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cep/v2/${normalizado}`, {
      cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!resposta.ok) return { ok: false, motivo: resposta.status === 404 ? "nao_encontrado" : "falha" };
    const dados = await resposta.json();
    if (dados.cep !== normalizado) return { ok: false, motivo: "falha" };
    return respostaParaCampos({ logradouro: dados.street, bairro: dados.neighborhood,
      localidade: dados.city, uf: dados.state });
  } catch { return { ok: false, motivo: "falha" }; }
}
