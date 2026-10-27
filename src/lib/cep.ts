// ============================================================
// DONA SIL — CONSULTA DE CEP (ViaCEP — API pública, sem chave)
// ============================================================
// Autopreenchimento do endereço no checkout. Regras da casa:
//   * JSON externo NUNCA é confiado: a resposta é validada com
//     Zod antes de virar estado do formulário.
//   * Falhas são mostradas na tela. O endereço da entrega deve
//     ser confirmado pelo CEP; não há edição manual dos campos
//     retornados. Rua e número ficam separados.
//   * Somente o CEP (dado público) é enviado à API. Sem chave,
//     sem token, sem variável de ambiente.
//   * A validação REAL continua no servidor (src/lib/pedido.ts +
//     src/app/finalizar/actions.ts) — nada do que vem daqui é
//     tratado como verdade final. Os limites de tamanho abaixo
//     são IGUAIS aos do Zod do servidor: o autopreenchimento
//     nunca coloca um valor que a validação de lá rejeitaria.
//
// Formato confirmado por consulta real à API (21/10/2026):
//   * CEP válido    → 200 + {cep, logradouro, complemento,
//     unidade, bairro, localidade, uf, estado, regiao, ibge,
//     gia, ddd, siafi}; campos de endereço podem vir vazios.
//   * CEP inexistente → 200 + {"erro": "true"} — o valor é a
//     STRING "true" (pegadinha: comparar com boolean não pega).
//   * Formato inválido → 400.
//   * CORS liberado (Access-Control-Allow-Origin: *) — a chamada
//     pode ser feita direto do navegador.
// ============================================================

import { z } from "zod";

const URL_BASE = "https://viacep.com.br/ws";
const TEMPO_LIMITE_MS = 8_000;

/**
 * Deixa apenas os dígitos do CEP. Devolve a sequência de 8
 * dígitos quando estiver completa, ou "" em qualquer outro caso
 * (menos de 8, mais de 8, vazio, só letras…). Aceita tanto
 * "52000-000" quanto "52000000" — os dois formatos que o Zod do
 * servidor aceita.
 */
export function normalizarCep(valor: string): string {
  const digitos = valor.replace(/\D+/g, "");
  return digitos.length === 8 ? digitos : "";
}

/** Campos que a consulta pode preencher (nomes do formulário). */
export type CamposViaCep = {
  endereco: string; // ViaCEP "logradouro" — SEM número (a cliente completa)
  bairro: string;
  cidade: string; // ViaCEP "localidade"
  uf: string; // 2 letras maiúsculas
};

/**
 * Resultado da consulta. `nao_encontrado` é o caso legítimo de
 * CEP com formato certo que não existe; `falha` é qualquer
 * outra coisa (rede, tempo esgotado, resposta fora do formato).
 * A função nunca lança.
 */
export type ResultadoCep =
  | { ok: true; dados: CamposViaCep }
  | { ok: false; motivo: "nao_encontrado" | "falha" };

// Esquema da resposta: tolerante nos campos que podem faltar ou
// vir vazios (logradouro/bairro/localidade/uf), explícito na
// bandeira de erro (string "true" — ver cabeçalho).
const respostaViaCepSchema = z.object({
  logradouro: z.string().catch(""),
  bairro: z.string().catch(""),
  localidade: z.string().catch(""),
  uf: z.string().catch(""),
  erro: z.union([z.literal("true"), z.literal(true)]).optional(),
});

/**
 * Converte a resposta BRUTA da ViaCEP em campos do formulário.
 * Função pura (sem rede) — é ela que os testes cobrem:
 *   * formato fora do esquema → falha;
 *   * {"erro": "true"} (ou boolean) → nao_encontrado;
 *   * UF precisa virar 2 letras maiúsculas — senão falha
 *     (fail-closed: nunca preencher algo duvidoso);
 *   * limite de tamanho acima do servidor → falha.
 * Campos vazios na resposta seguem vazios — o componente só
 * preenche o que veio e não mexe no resto.
 */
export function respostaParaCampos(bruto: unknown): ResultadoCep {
  const resposta = respostaViaCepSchema.safeParse(bruto);
  if (!resposta.success) {
    return { ok: false, motivo: "falha" };
  }
  if (resposta.data.erro !== undefined) {
    return { ok: false, motivo: "nao_encontrado" };
  }

  const uf = resposta.data.uf.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) {
    return { ok: false, motivo: "falha" };
  }

  const campos: CamposViaCep = {
    endereco: resposta.data.logradouro.trim(),
    bairro: resposta.data.bairro.trim(),
    cidade: resposta.data.localidade.trim(),
    uf,
  };

  // Limites IGUAIS aos do dadosEntregaSchema (pedido.ts):
  // endereco 300, bairro 120, cidade 120, uf 2.
  if (
    campos.endereco.length > 300 ||
    campos.bairro.length > 120 ||
    campos.cidade.length > 120
  ) {
    return { ok: false, motivo: "falha" };
  }

  return { ok: true, dados: campos };
}

// Cache da sessão: o mesmo CEP não é consultado duas vezes
// (inclusive quando a cliente alterna entre dois CEPs válidos).
const cache = new Map<string, ResultadoCep>();

/**
 * Consulta o CEP na ViaCEP. Devolve resultado; nunca lança.
 * CEP malformado (normalizarCep vazio) já falha sem rede.
 */
export async function consultarCep(cep: string): Promise<ResultadoCep> {
  const normalizado = normalizarCep(cep);
  if (!normalizado) {
    return { ok: false, motivo: "falha" };
  }

  const emCache = cache.get(normalizado);
  if (emCache) {
    return emCache;
  }

  let resultado: ResultadoCep;
  try {
    const resposta = await fetch(`${URL_BASE}/${normalizado}/json/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });

    if (!resposta.ok) {
      // 400 = formato ruim (não deve ocorrer: CEP já normalizado);
      // 5xx = API fora do ar. Para a cliente é a mesma coisa:
      // aviso + preenchimento manual.
      resultado = { ok: false, motivo: "falha" };
    } else {
      const bruto: unknown = await resposta.json();
      resultado = respostaParaCampos(bruto);
    }
  } catch {
    // Rede caiu, tempo esgotado, JSON inválido — tudo vira falha.
    resultado = { ok: false, motivo: "falha" };
  }

  // Falha (rede, tempo esgotado, formato) NÃO entra no cache: é
  // transitória — a próxima tentativa deve ir à API de novo.
  // Sucesso e "não encontrado" são estáveis e ficam no cache.
  if (resultado.ok || resultado.motivo === "nao_encontrado") {
    cache.set(normalizado, resultado);
  }
  return resultado;
}
