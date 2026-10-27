import { normalizarCep, respostaParaCampos, type ResultadoCep } from "./cep";

/** Consulta independente no servidor: campos bloqueados no navegador não são prova do endereço. */
export async function consultarEnderecoServidor(cep: string): Promise<ResultadoCep> {
  const normalizado = normalizarCep(cep);
  if (!normalizado) return { ok: false, motivo: "nao_encontrado" };
  const base = process.env.CEP_API_URL ?? "https://viacep.com.br/ws";
  try {
    const resposta = await fetch(`${base}/${normalizado}/json/`, {
      cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!resposta.ok) return { ok: false, motivo: "falha" };
    return respostaParaCampos(await resposta.json());
  } catch {
    return { ok: false, motivo: "falha" };
  }
}
