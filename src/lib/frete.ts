// ============================================================
// DONA SIL — ETAPA 5a — CAMADA DE FRETE (Somente leitura)
// ============================================================
// Consulta as faixas de frete ativas pelo `fetch` nativo
// (PostgREST), SEMPRE no servidor (Server Components /
// Server Actions). Sem SDK, sem chave secreta.
//
// Segurança:
//   * Usa apenas as variáveis públicas NEXT_PUBLIC_SUPABASE_URL
//     e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (chave anônima).
//   * NUNCA utiliza a SUPABASE_SECRET_KEY.
//   * Só faz GET de leitura na tabela pública faixas_frete
//     (leitura pública confirmada na revisão de segurança: C2/C3).
//   * Toda resposta é validada com Zod antes de virar tipo.
//   * Erros NUNCA viram lista vazia: falha sempre lança FreteErro
//     e quem chama decide o que mostrar.
//   * O valor do frete vem SEMPRE do banco. O navegador nunca é
//     fonte confiável de preço ou frete — apenas escolhe o ID.
// ============================================================

import { cache } from "react";
import { z } from "zod";

// ------------------------------------------------------------
// Erros da camada de frete
// ------------------------------------------------------------

export type FreteErroTipo =
  | "configuracao" // variável de ambiente ausente
  | "rede" // rede indisponível, tempo esgotado, DNS
  | "http" // o Supabase respondeu com erro (4xx/5xx)
  | "dados"; // JSON inválido ou fora do schema esperado

const MENSAGENS: Record<FreteErroTipo, string> = {
  configuracao: "As opções de entrega não estão configuradas neste ambiente.",
  rede: "Não foi possível falar com o servidor agora. Tente de novo em instantes.",
  http: "O servidor respondeu com um erro ao buscar as opções de entrega.",
  dados: "As opções de entrega recebidas estão em um formato inesperado.",
};

export class FreteErro extends Error {
  readonly tipo: FreteErroTipo;

  constructor(tipo: FreteErroTipo, mensagem?: string) {
    super(mensagem ?? MENSAGENS[tipo]);
    this.name = "FreteErro";
    this.tipo = tipo;
  }
}

// ------------------------------------------------------------
// Schema Zod — espelha a tabela faixas_frete do schema real
// (id uuid, nome text, valor numeric, ativo boolean, ordem int;
//  a coluna `ordem` é a ordenação oficial definida no banco).
// ------------------------------------------------------------

const faixaFreteSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  valor: z.number().nonnegative(),
});

export type FaixaFrete = {
  id: string;
  nome: string;
  valor: number;
};

// ------------------------------------------------------------
// Consulta base ao PostgREST (mesma disciplina de catalogo.ts)
// ------------------------------------------------------------

const TEMPO_LIMITE_MS = 10_000;

function exigirConfiguracao(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    // Mensagem genérica: não expõe nenhum valor do ambiente.
    throw new FreteErro("configuracao");
  }
  return { url: url.replace(/\/+$/, ""), chave };
}

/**
 * Faixas de frete ATIVAS, na ordem definida pelo banco (coluna
 * `ordem`). Envolta em React `cache`: se a página e mais de um
 * componente precisarem da lista na mesma requisição, a consulta
 * roda uma vez só.
 */
export const listarFaixasFrete = cache(async (): Promise<FaixaFrete[]> => {
  const { url, chave } = exigirConfiguracao();
  const params = new URLSearchParams({
    select: "id,nome,valor",
    ativo: "eq.true",
    order: "ordem.asc,nome.asc",
  });
  const rota = `${url}/rest/v1/faixas_frete?${params.toString()}`;

  let resposta: Response;
  try {
    resposta = await fetch(rota, {
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        Accept: "application/json",
      },
      // Sempre fresco: o valor do frete decide preço de venda.
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new FreteErro("rede");
  }

  if (!resposta.ok) {
    throw new FreteErro("http");
  }

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    throw new FreteErro("dados");
  }

  const resultado = z.array(faixaFreteSchema).safeParse(bruto);
  if (!resultado.success) {
    throw new FreteErro("dados");
  }

  // Lista vazia aqui é resultado REAL do banco (nenhuma faixa
  // ativa cadastrada) — caso legítimo, distinto de falha.
  const faixas = resultado.data.map((faixa) => ({
    id: faixa.id,
    nome: faixa.nome,
    valor: faixa.valor,
  }));
  if (!faixas.length) return [];
  return [
    ...faixas.filter(f => [FAIXA_ZONA_NORTE, FAIXA_ZONA_SUL, FAIXA_RETIRADA_NO_LOCAL].includes(f.nome)),
    { id: FAIXA_COTACAO_ID, nome: FAIXA_COTACAO, valor: 0 },
  ];
});

// ------------------------------------------------------------
// Regras comerciais de frete (decisão de negócio da loja)
// ------------------------------------------------------------
// Tarifas FIXAS por região — não variam com o custo do serviço
// de entrega (a loja absorve eventuais diferenças). Nomes neutros:
// nenhum fornecedor logístico é citado para as clientes.
//
// Contrato FAIL-CLOSED: o servidor só aceita uma faixa cujo nome
// esteja nesta lista canônica — faixa renomeada ou inédita no
// banco bloqueia a finalização com erro claro, nunca cobra um
// valor "por aproximação". Para mudar uma tarifa, atualize o
// banco (supabase/atualizar-fretes.sql) e estas constantes JUNTOS.
// ------------------------------------------------------------

export const FAIXA_ZONA_NORTE = "Recife — Zona Norte";
export const FAIXA_COTACAO = "Outras cidades — calcular frete";
export const FAIXA_COTACAO_ID = "00000000-0000-4000-8000-000000000099";
export const FAIXA_ZONA_SUL = "Recife — Zona Sul";
export const FAIXA_RMR = "Região Metropolitana do Recife";
export const FAIXA_INTERIOR_PE = "Interior de Pernambuco";
export const FAIXA_OUTROS_ESTADOS = "Outros estados";
export const FAIXA_RETIRADA_NO_LOCAL =
  "Retirada no local — endereço combinado pelo WhatsApp";

const FAIXAS_CONHECIDAS: ReadonlySet<string> = new Set([
  FAIXA_COTACAO,
  FAIXA_ZONA_NORTE,
  FAIXA_ZONA_SUL,
  FAIXA_RMR,
  FAIXA_INTERIOR_PE,
  FAIXA_OUTROS_ESTADOS,
  FAIXA_RETIRADA_NO_LOCAL,
]);

/**
 * R$ 129,99 em centavos. Frete GRÁTIS para ENTREGAS quando o
 * subtotal dos produtos é ESTRITAMENTE maior que este valor
 * (R$ 129,99 paga a tarifa regional; R$ 130,00 já é grátis).
 * A retirada no local é gratuita em qualquer subtotal pela
 * própria tarifa zero cadastrada no banco.
 */
export const LIMITE_FRETE_GRATIS_CENTAVOS = 12_999;

/** Converte um valor em reais para centavos (inteiro exato). */
export function paraCentavos(valor: number): number {
  return Math.round(valor * 100);
}

export type FreteAplicado = {
  /** Valor final cobrado (0 = grátis). */
  valor: number;
  /** true quando o frete foi zerado pela regra do subtotal. */
  gratis: boolean;
};

/**
 * Regra central de frete — aplicada SEMPRE no servidor. O subtotal
 * entra em CENTAVOS inteiros (Σ paraCentavos(preço) × quantidade):
 * aritmética inteira, sem erro de ponto flutuante na fronteira.
 */
export function calcularFreteAplicado(
  subtotalCentavos: number,
  faixa: FaixaFrete,
): FreteAplicado {
  if (subtotalCentavos > LIMITE_FRETE_GRATIS_CENTAVOS) {
    return { valor: 0, gratis: true };
  }
  return { valor: faixa.valor, gratis: false };
}

/** O nome da faixa está na lista canônica conhecida pelo código? */
export function faixaConhecida(nome: string): boolean {
  return FAIXAS_CONHECIDAS.has(nome);
}

/**
 * A região combina com a UF informada?
 *   * Recife — Zona Norte, Recife — Zona Sul, Região
 *     Metropolitana do Recife e Interior de Pernambuco: UF = PE.
 *   * Outros estados: UF ≠ PE.
 *   * Retirada no local: QUALQUER UF (a cliente combina a
 *     retirada com o atendimento pelo WhatsApp).
 * Nome desconhecido = incompatível (fail-closed).
 */
export function regiaoCompativelComUf(nome: string, uf: string): boolean {
  if (!faixaConhecida(nome)) return false;
  const ufNormalizada = uf.trim().toUpperCase();
  if (nome === FAIXA_COTACAO) return true;
  if (nome === FAIXA_RETIRADA_NO_LOCAL) return true;
  if (nome === FAIXA_OUTROS_ESTADOS) return ufNormalizada !== "PE";
  return ufNormalizada === "PE";
}

/** É a faixa canônica de retirada no local? */
export function retiradaNoLocal(nome: string): boolean {
  return nome === FAIXA_RETIRADA_NO_LOCAL;
}
