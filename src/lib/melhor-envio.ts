import { z } from "zod";
import type { ItemResumo } from "./pedido";
import { normalizarCep } from "./cep";

export type OpcaoCorreios = { id: string; nome: string; valor: number; prazo: number };
export class CotacaoErro extends Error {}

function configuracao() {
  const config = z.object({
    token: z.string().min(20), origem: z.string().regex(/^\d{8}$/),
    contato: z.email(), peso: z.coerce.number().positive().max(30),
    altura: z.coerce.number().positive().max(100), largura: z.coerce.number().positive().max(100),
    comprimento: z.coerce.number().positive().max(100),
  }).safeParse({
    token: process.env.MELHOR_ENVIO_TOKEN, origem: process.env.FRETE_CEP_ORIGEM?.replace(/\D/g, ""),
    contato: process.env.MELHOR_ENVIO_CONTATO, peso: process.env.FRETE_PESO_PECA_KG,
    altura: process.env.FRETE_ALTURA_PECA_CM, largura: process.env.FRETE_LARGURA_PECA_CM,
    comprimento: process.env.FRETE_COMPRIMENTO_PECA_CM,
  });
  return config.success ? config.data : null;
}

export function cotacaoConfigurada() { return configuracao() !== null; }

/** Somente cotação: não cria etiquetas, não paga e não transmite dados pessoais da cliente. */
export async function cotarCorreios(cep: string, itens: ItemResumo[]): Promise<OpcaoCorreios[]> {
  const config = configuracao();
  if (!config) throw new CotacaoErro("A cotação para outras cidades ainda não está disponível. Fale com a loja para consultar o frete.");
  if (!normalizarCep(cep)) throw new CotacaoErro("Informe um CEP válido para calcular o frete.");
  try {
    const resposta = await fetch("https://melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", Accept: "application/json", "User-Agent": `Dona Sil (${config.contato})` },
      body: JSON.stringify({
        from: { postal_code: config.origem }, to: { postal_code: normalizarCep(cep) },
        products: itens.map(item => ({ id: item.variacaoId, width: config.largura, height: config.altura,
          length: config.comprimento, weight: config.peso, insurance_value: item.precoUnitario, quantity: item.quantidade })),
        services: "1,2", options: { receipt: false, own_hand: false },
      }),
    });
    if (!resposta.ok) throw new Error("Serviço indisponível");
    const bruto: unknown = await resposta.json();
    if (!Array.isArray(bruto)) throw new Error("Resposta inválida");
    const opcoes: OpcaoCorreios[] = [];
    for (const valor of bruto) {
      const opcao = z.object({ id: z.union([z.number(), z.string()]), name: z.string().min(1).max(80),
        custom_price: z.union([z.string().min(1), z.number()]).transform(Number).pipe(z.number().finite().nonnegative()),
        custom_delivery_time: z.coerce.number().int().nonnegative(), error: z.unknown().optional(),
        company: z.object({ name: z.string() }),
      }).safeParse(valor);
      if (!opcao.success || opcao.data.error || opcao.data.company.name.toLowerCase() !== "correios") continue;
      if (!["1", "2"].includes(String(opcao.data.id))) continue;
      opcoes.push({ id: String(opcao.data.id), nome: `Correios ${opcao.data.name}`,
        valor: Math.round(opcao.data.custom_price * 100) / 100, prazo: opcao.data.custom_delivery_time });
    }
    if (!opcoes.length) throw new Error("Nenhum serviço disponível");
    return opcoes.sort((a,b) => a.valor - b.valor);
  } catch {
    throw new CotacaoErro("Não foi possível calcular o frete agora. Tente novamente ou fale com a loja.");
  }
}
