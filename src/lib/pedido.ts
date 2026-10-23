// ============================================================
// DONA SIL — ETAPA 5a — REGRAS DE PEDIDO E SACOLA (puras)
// ============================================================
// Tipos e validações da sacola e do futuro pedido, espelhando
// EXATAMENTE as regras da função criar_pedido do banco
// (supabase/funcoes-estoque.sql):
//
//   * Máximo de 10 unidades por variação (v_limite_item).
//   * Máximo de 20 linhas no carrinho (v_limite_carrinho).
//   * Na SACOLA do navegador o teto é ainda menor: o menor valor
//     entre 10 e a FOTO do estoque na inclusão (tetoDoItem). Foto
//     é registro antigo — nunca estoque atual; o banco confere de
//     verdade na finalização.
//   * O limite de 10 vale TAMBÉM na soma de linhas repetidas
//     da mesma variação (passo 4b) — dividir o item em várias
//     linhas não contorna o limite.
//   * Campos da entrega: nome (≤200), whatsapp (DDD + número:
//     (81) 99999-8888, (81) 3222-2222 ou 10-11 dígitos colados;
//     ≤30 — o BANCO valida só presença/comprimento, aqui o
//     formato é mais estrito de propósito: o servidor nunca
//     confia que veio do navegador mascarado), cep
//     (formato 00000-000, hífen opcional), endereco (≤300),
//     complemento (≤200), bairro (≤120), cidade (≤120),
//     uf (2 letras maiúsculas).
//   * O navegador envia apenas (variacao_id, quantidade).
//     Preço e frete NUNCA vêm do navegador.
//
// Este arquivo é PURO (sem React, sem DOM): pode rodar no
// servidor, no cliente e em testes. O carrinho é uma
// conveniência do navegador — nunca fonte confiável de preço
// ou estoque; tudo será revalidado no servidor na finalização.
// ============================================================

import { z } from "zod";

// ------------------------------------------------------------
// Limites oficiais (idênticos aos do banco)
// ------------------------------------------------------------

export const LIMITE_UNIDADES_POR_ITEM = 10;
export const LIMITE_LINHAS_CARRINHO = 20;

/**
 * Moeda para a mensagem de WhatsApp — mesmo formato de
 * `formatarBRL` (src/lib/format.ts). Espelhada aqui (e não
 * importada) porque este arquivo é PURO e precisa rodar também
 * em testes Node, sem resolução de caminhos do Next.js. Os
 * testes comparam as duas funções para evitar divergência.
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// ------------------------------------------------------------
// Sacola persistida no navegador (localStorage versionado)
// ------------------------------------------------------------

export const VERSAO_SACOLA = 1;
export const CHAVE_SACOLA = "donasil:sacola:v1";

/** Item da sacola. `precoUnitario` e `estoqueNoMomento` são
 *  informativos (foto do momento da inclusão) — revalidados no
 *  servidor antes de qualquer pedido. */
export type ItemCarrinho = {
  variacaoId: string;
  produtoSlug: string;
  produtoNome: string;
  tamanho: string;
  cor: string;
  precoUnitario: number;
  quantidade: number;
  estoqueNoMomento: number;
};

const itemSacolaSchema = z.object({
  variacaoId: z.uuid(),
  produtoSlug: z.string().min(1),
  produtoNome: z.string().min(1),
  tamanho: z.string().min(1),
  cor: z.string().min(1),
  precoUnitario: z.number().nonnegative(),
  quantidade: z.number().int().min(1).max(LIMITE_UNIDADES_POR_ITEM),
  estoqueNoMomento: z.number().int().nonnegative(),
});

const envelopeSacolaSchema = z.object({
  versao: z.literal(VERSAO_SACOLA),
  itens: z.array(z.unknown()),
});

export type SacolaArmazenada = {
  versao: number;
  itens: ItemCarrinho[];
};

export function paraArmazenar(itens: ItemCarrinho[]): SacolaArmazenada {
  return { versao: VERSAO_SACOLA, itens };
}

/**
 * Lê a sacola salva com defesa total contra dados inválidos:
 * nunca lança, nunca devolve lixo. Itens corrompidos são
 * descartados um a um (um item ruim não apaga a sacola inteira);
 * linhas repetidas da mesma variação são unificadas respeitando o
 * limite de 10 unidades; acima de 20 linhas, o excesso é
 * descartado. `problema` explica o que foi ajustado.
 */
export function lerSacolaArmazenada(
  bruto: string | null,
): { itens: ItemCarrinho[]; problema: string | null } {
  if (bruto === null) {
    return { itens: [], problema: null };
  }

  let dados: unknown;
  try {
    dados = JSON.parse(bruto);
  } catch {
    return { itens: [], problema: "A sacola salva estava corrompida e foi limpa." };
  }

  const envelope = envelopeSacolaSchema.safeParse(dados);
  if (!envelope.success) {
    return { itens: [], problema: "A sacola salva estava em um formato antigo e foi limpa." };
  }

  const bons: ItemCarrinho[] = [];
  let descartados = 0;
  for (const candidato of envelope.data.itens) {
    const item = itemSacolaSchema.safeParse(candidato);
    if (item.success) {
      bons.push(item.data);
    } else {
      descartados += 1;
    }
  }

  const unificados = unificarItens(bons);
  const problema =
    descartados > 0
      ? "Alguns itens salvos estavam inválidos e foram removidos da sacola."
      : unificados.descartados > 0 || unificados.ajustado
        ? "Sua sacola foi ajustada para respeitar os limites da loja."
        : null;

  return { itens: unificados.itens, problema };
}

/** Une linhas repetidas da mesma variação (soma as quantidades
 *  com o teto da foto mais recente — passo 4b do banco + M1) e
 *  limita a 20 linhas. Marca `ajustado` quando alguma soma foi
 *  reduzida, para a interface avisar a pessoa (M3). */
function unificarItens(
  itens: ItemCarrinho[],
): { itens: ItemCarrinho[]; descartados: number; ajustado: boolean } {
  const porVariacao = new Map<string, ItemCarrinho>();
  let descartados = 0;
  let ajustado = false;

  for (const item of itens) {
    const existente = porVariacao.get(item.variacaoId);
    if (!existente) {
      if (porVariacao.size >= LIMITE_LINHAS_CARRINHO) {
        descartados += 1;
        continue;
      }
      porVariacao.set(item.variacaoId, item);
      continue;
    }
    // Mesma variação em duas linhas: soma com o teto da foto
    // mais recente. Linha única acima da foto NÃO é mexida aqui —
    // fica para a interface avisar e a pessoa decidir.
    const soma = existente.quantidade + item.quantidade;
    const quantidade = Math.min(tetoDoItem(item), soma);
    if (quantidade !== soma) {
      ajustado = true;
    }
    porVariacao.set(item.variacaoId, { ...item, quantidade });
  }

  return { itens: [...porVariacao.values()], descartados, ajustado };
}

// ------------------------------------------------------------
// Operações puras da sacola (limites SEMPRE aplicados)
// ------------------------------------------------------------

/**
 * Teto de unidades de UMA variação na sacola: o menor valor entre
 * o limite geral (10) e a FOTO do estoque no momento da inclusão
 * (quando positiva). Foto zerada não limita — a linha já nasce
 * marcada como Indisponível na interface.
 *
 * IMPORTANTE: a foto é um registro ANTIGO, nunca o estoque atual
 * do banco. Ela serve para evitar quantidades evidentemente
 * irreais na sacola; a conferência de verdade acontece no
 * servidor, na finalização (Etapa 5c).
 */
export function tetoDoItem(item: { estoqueNoMomento: number }): number {
  return item.estoqueNoMomento > 0
    ? Math.min(LIMITE_UNIDADES_POR_ITEM, item.estoqueNoMomento)
    : LIMITE_UNIDADES_POR_ITEM;
}

/**
 * Adiciona um item. Se a variação já está na sacola, soma a
 * quantidade respeitando o teto da FOTO de estoque mais recente
 * (M1: a soma nunca passa do menor valor entre 10 unidades e o
 * estoque registrado na inclusão). Se a sacola já tem 20 linhas
 * diferentes, ignora a adição. Nunca lança, nunca remove linhas.
 */
export function adicionarItem(
  itens: ItemCarrinho[],
  novo: ItemCarrinho,
): ItemCarrinho[] {
  const quantidade = Math.max(1, Math.floor(novo.quantidade));
  const teto = tetoDoItem(novo);

  const existente = itens.find((item) => item.variacaoId === novo.variacaoId);
  if (existente) {
    // Re-adicionar renova a foto de estoque (a mais recente vence)
    // e soma com teto — nunca ultrapassa o registrado.
    return itens.map((item) =>
      item.variacaoId === novo.variacaoId
        ? {
            ...novo,
            quantidade: Math.min(teto, item.quantidade + quantidade),
          }
        : item,
    );
  }

  if (itens.length >= LIMITE_LINHAS_CARRINHO) {
    return itens;
  }

  return [...itens, { ...novo, quantidade: Math.min(teto, quantidade) }];
}

/**
 * Altera a quantidade de uma variação (1 até o teto da linha:
 * menor entre 10 e a foto de estoque). Quantidade 0 ou menor não
 * faz nada — remoção é explícita. Uma linha antiga que esteja
 * acima do teto só desce quando a própria pessoa mexe nela
 * (a interface mostra o aviso e o botão de ajuste).
 */
export function mudarQuantidade(
  itens: ItemCarrinho[],
  variacaoId: string,
  quantidade: number,
): ItemCarrinho[] {
  if (!Number.isFinite(quantidade) || quantidade < 1) {
    return itens;
  }
  return itens.map((item) => {
    if (item.variacaoId !== variacaoId) {
      return item;
    }
    const alvo = Math.max(1, Math.floor(quantidade));
    return { ...item, quantidade: Math.min(tetoDoItem(item), alvo) };
  });
}

/** Remove a linha da variação indicada. */
export function removerItem(
  itens: ItemCarrinho[],
  variacaoId: string,
): ItemCarrinho[] {
  return itens.filter((item) => item.variacaoId !== variacaoId);
}

/** Total de unidades na sacola (soma das quantidades). */
export function totalUnidades(itens: ItemCarrinho[]): number {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}

/** Subtotal INFORMATIVO com os preços do momento da inclusão.
 *  Na finalização o servidor refaz a conta com os preços reais
 *  do banco — este valor nunca é usado como fonte confiável. */
export function subtotalSacola(itens: ItemCarrinho[]): number {
  return itens.reduce(
    (total, item) => total + item.precoUnitario * item.quantidade,
    0,
  );
}

// ------------------------------------------------------------
// Schemas do pedido (contrato espelhado de criar_pedido)
// ------------------------------------------------------------

/** Item do pedido: o navegador envia APENAS isto — nunca preço. */
export const itemPedidoSchema = z.object({
  variacaoId: z.uuid("Escolha um tamanho e uma cor."),
  quantidade: z
    .number()
    .int("A quantidade precisa ser um número inteiro.")
    .min(1, "A quantidade mínima é 1.")
    .max(LIMITE_UNIDADES_POR_ITEM, `Máximo de ${LIMITE_UNIDADES_POR_ITEM} unidades da mesma peça.`),
});

/** Dados da entrega (espelham as validações dos passos 3 e 5 de
 *  criar_pedido: mesmos campos, mesmos tamanhos, mesma regra da UF). */
export const dadosEntregaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, "Informe o nome para a entrega.")
    .max(200, "O nome é muito longo (máximo 200 letras)."),
  whatsapp: z
    .string()
    .trim()
    .min(1, "Informe o WhatsApp para combinarmos a entrega.")
    // DDD OBRIGATÓRIO: aceita o formato da máscara do site
    // ("(81) 99999-8888" celular / "(81) 3222-2222" fixo) ou
    // 10-11 dígitos colados ("81999998888") — 10-11 dígitos
    // significam DDD (2) + número (8 fixo / 9 celular).
    .regex(
      /^(\(\d{2}\) \d{4,5}-\d{4}|\d{10,11})$/,
      "WhatsApp inválido — informe o DDD e o número, ex.: (81) 99999-8888.",
    )
    .max(30, "O WhatsApp é muito longo."),
  cep: z
    .string()
    .trim()
    .min(1, "Informe o CEP.")
    .max(20, "O CEP é muito longo.")
    // Somente FORMATO — o CEP nunca é usado para deduzir a região
    // de entrega (a cliente escolhe a região; o servidor confere
    // a compatibilidade com a UF).
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido — use o formato 00000-000."),
  endereco: z
    .string()
    .trim()
    .min(1, "Informe o endereço de entrega.")
    .max(300, "O endereço é muito longo (máximo 300 letras)."),
  complemento: z
    .string()
    .trim()
    .max(200, "O complemento é muito longo (máximo 200 letras)."),
  bairro: z
    .string()
    .trim()
    .max(120, "O bairro é muito longo (máximo 120 letras)."),
  cidade: z
    .string()
    .trim()
    .min(1, "Informe a cidade.")
    .max(120, "A cidade é muito longa (máximo 120 letras)."),
  uf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "A UF deve ter 2 letras (ex.: PE)."),
  faixaFreteId: z.uuid("Escolha a região de entrega."),
});

export type DadosEntrega = z.infer<typeof dadosEntregaSchema>;

/** Itens do pedido: 1 a 20 linhas. A SOMA de linhas repetidas da
 *  mesma variação também respeita o limite de 10 unidades
 *  (passo 4b do contrato criar_pedido). Usado pelo
 *  payloadPedidoSchema (futuro banco) e pela finalização 5c. */
export const itensPedidoSchema = z
  .array(itemPedidoSchema)
  .min(1, "A sacola está vazia.")
  .max(LIMITE_LINHAS_CARRINHO, `Máximo de ${LIMITE_LINHAS_CARRINHO} peças diferentes por pedido.`);

/** Payload completo da futura finalização. Espelha o contrato do
 *  banco, inclusive o passo 4b. */
export const payloadPedidoSchema = z
  .object({
    entrega: dadosEntregaSchema,
    itens: itensPedidoSchema,
  })
  .superRefine((dados, ctx) => {
    const somas = new Map<string, number>();
    for (const item of dados.itens) {
      somas.set(item.variacaoId, (somas.get(item.variacaoId) ?? 0) + item.quantidade);
    }
    for (const soma of somas.values()) {
      if (soma > LIMITE_UNIDADES_POR_ITEM) {
        ctx.addIssue({
          code: "custom",
          path: ["itens"],
          message: `Mais de ${LIMITE_UNIDADES_POR_ITEM} unidades da mesma peça não podem ir em um único pedido.`,
        });
        break;
      }
    }
  });

export type PayloadPedido = z.infer<typeof payloadPedidoSchema>;

// ------------------------------------------------------------
// ETAPA 5c — Finalização SEM banco (resumo + WhatsApp)
// ------------------------------------------------------------
// Nesta etapa o pedido NÃO é gravado no Supabase: a finalização
// valida os dados com o banco público (preço e estoque atuais),
// monta um resumo e entrega o pedido ao atendimento da loja por
// WhatsApp. A integração real (RPC criar_pedido) é a Etapa 5d e
// depende de autorização explícita — fica documentada aqui, em
// `paraPayloadBanco`, mas NÃO é usada em nenhum lugar ainda.
// ------------------------------------------------------------

/** Linha enviada pelo navegador na finalização: SÓ identificação
 *  e quantidade. Preço, estoque, nome — nada disso vem do
 *  navegador; o servidor busca tudo no catálogo real. */
export const linhaSubmetidaSchema = itemPedidoSchema.extend({
  produtoSlug: z.string().min(1),
});

export type LinhaSubmetida = z.infer<typeof linhaSubmetidaSchema>;

/** Linhas submetidas: 1 a 20, soma por variação ≤ 10 unidades
 *  (passo 4b aplicado no servidor, igual ao banco). */
export const linhasSubmetidasSchema = z
  .array(linhaSubmetidaSchema)
  .min(1, "A sacola está vazia.")
  .max(LIMITE_LINHAS_CARRINHO, `Máximo de ${LIMITE_LINHAS_CARRINHO} peças diferentes por pedido.`)
  .superRefine((linhas, ctx) => {
    const somas = new Map<string, number>();
    for (const linha of linhas) {
      somas.set(linha.variacaoId, (somas.get(linha.variacaoId) ?? 0) + linha.quantidade);
    }
    for (const soma of somas.values()) {
      if (soma > LIMITE_UNIDADES_POR_ITEM) {
        ctx.addIssue({
          code: "custom",
          path: [],
          message: `Mais de ${LIMITE_UNIDADES_POR_ITEM} unidades da mesma peça não podem ir em um único pedido.`,
        });
        break;
      }
    }
  });

/** Agrupa linhas repetidas da mesma variação somando as
 *  quantidades (a soma já foi limitada a 10 pelo schema). */
export function agruparPorVariacao(
  linhas: LinhaSubmetida[],
): LinhaSubmetida[] {
  const mapa = new Map<string, LinhaSubmetida>();
  for (const linha of linhas) {
    const anterior = mapa.get(linha.variacaoId);
    if (anterior) {
      mapa.set(linha.variacaoId, {
        ...anterior,
        quantidade: anterior.quantidade + linha.quantidade,
      });
    } else {
      mapa.set(linha.variacaoId, { ...linha });
    }
  }
  return [...mapa.values()];
}

/** Item já REVALIDADO com o catálogo real: preço e nome vêm do
 *  banco no momento da conferência (nunca do navegador). */
export type ItemResumo = {
  variacaoId: string;
  produtoSlug: string;
  produtoNome: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  precoUnitario: number;
};

/** Resumo pronto para conferência da cliente. `mensagemWhatsApp`
 *  é o texto do atendimento; `total` = subtotal + frete.
 *  `retirada` = true quando a faixa escolhida é a retirada no
 *  local: o endereço NÃO vai no resumo nem na mensagem — o
 *  local é combinado pelo atendimento no WhatsApp. */
export type ResumoPedido = {
  itens: ItemResumo[];
  subtotal: number;
  frete: { id: string; nome: string; valor: number };
  retirada: boolean;
  total: number;
  entrega: DadosEntrega;
  mensagemWhatsApp: string;
};

/**
 * Monta a mensagem do pedido para o WhatsApp OFICIAL da loja.
 * Legível e itemizada — e mínima: NÃO inclui o telefone da
 * própria cliente (o WhatsApp já mostra o remetente) nem nada
 * além do que o atendimento precisa para confirmar o pedido.
 */
export function montarMensagemWhatsApp(resumo: ResumoPedido): string {
  const pecas = resumo.itens.map(
    (item) =>
      `• ${item.produtoNome} — Tam. ${item.tamanho}, ${item.cor} — ` +
      `${item.quantidade} × ${formatarMoeda(item.precoUnitario)} = ` +
      `${formatarMoeda(item.quantidade * item.precoUnitario)}`,
  );

  // Frete zero = "Grátis" (regra do subtotal ou retirada no local).
  const freteTexto =
    resumo.frete.valor === 0 ? "Grátis" : formatarMoeda(resumo.frete.valor);

  const linhas: string[] = [
    "Olá! Gostaria de fazer um pedido pelo site da Dona Sil.",
    "",
    "Peças:",
    ...pecas,
    "",
    `Subtotal: ${formatarMoeda(resumo.subtotal)}`,
    `Frete (${resumo.frete.nome}): ${freteTexto}`,
    `Total: ${formatarMoeda(resumo.total)}`,
    "",
    "Entrega:",
  ];

  if (resumo.retirada) {
    // Retirada: NADA do endereço (da cliente ou do estoque) vai na
    // mensagem — o local é combinado pelo atendimento no WhatsApp.
    linhas.push("Retirada no local — endereço a combinar");
  } else {
    const endereco = [
      resumo.entrega.endereco,
      resumo.entrega.complemento,
      resumo.entrega.bairro,
    ]
      .filter((parte) => parte.length > 0)
      .join(" — ");

    linhas.push(
      resumo.entrega.nome,
      endereco,
      `${resumo.entrega.cidade} — ${resumo.entrega.uf}`,
      `CEP ${resumo.entrega.cep}`,
    );
  }

  linhas.push(
    "",
    "Enviado pelo site da Dona Sil. Aguardo a confirmação do atendimento.",
  );

  return linhas.join("\n");
}

/**
 * CONTRATO FUTURO (Etapa 5d) — NÃO usada em nenhum lugar ainda.
 * Mapeia o resumo para o formato snake_case exato esperado pela
 * RPC criar_pedido(jsonb, uuid). A integração real depende de
 * decisão e autorização explícitas (chave de serviço); enquanto
 * isso, esta função pura documenta o contrato e é coberta por
 * testes — evita surpresa de nomes na hora de integrar.
 */
export function paraPayloadBanco(resumo: ResumoPedido) {
  return {
    entrega: {
      nome: resumo.entrega.nome,
      whatsapp: resumo.entrega.whatsapp,
      cep: resumo.entrega.cep,
      endereco: resumo.entrega.endereco,
      complemento: resumo.entrega.complemento,
      bairro: resumo.entrega.bairro,
      cidade: resumo.entrega.cidade,
      uf: resumo.entrega.uf,
      faixa_frete_id: resumo.frete.id, // camelCase → snake_case
    },
    itens: resumo.itens.map((item) => ({
      variacao_id: item.variacaoId, // camelCase → snake_case
      quantidade: item.quantidade,
    })),
  };
}
