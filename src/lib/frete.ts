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
  return resultado.data.map((faixa) => ({
    id: faixa.id,
    nome: faixa.nome,
    valor: faixa.valor,
  }));
});
