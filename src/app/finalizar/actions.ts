"use server";

// ============================================================
// DONA SIL — ETAPA 5c — FINALIZAÇÃO SEM BANCO (Server Action)
// ============================================================
// Confere a sacola com os dados REAIS do catálogo público e
// monta o resumo do pedido. NÃO grava pedido nenhum: a loja
// conclui o atendimento pelo WhatsApp.
//
// Segurança:
//   * O navegador envia apenas (variacaoId, quantidade,
//     produtoSlug) + os campos do formulário. NUNCA preço,
//     frete ou estoque — tudo isso é lido do banco aqui.
//   * Somente consultas de LEITURA (GET público) via camadas
//     catalogo.ts / frete.ts. Zero RPC, zero chave secreta.
//   * Validação dupla: o formulário valida no navegador
//     (required/maxLength/pattern) e TUDO é revalidado aqui
//     com os mesmos schemas Zod do contrato do banco.
//   * `produtoSlug` é só uma dica de localização: o servidor só
//     aceita a variação se ela pertencer ao produto buscado.
// ============================================================

import { CatalogoErro, obterProduto } from "@/lib/catalogo";
import {
  FreteErro,
  calcularFreteAplicado,
  faixaConhecida,
  listarFaixasFrete,
  paraCentavos,
  regiaoCompativelComUf,
  retiradaNoLocal,
} from "@/lib/frete";
import { linkWhatsApp } from "@/lib/whatsapp";
import {
  agruparPorVariacao,
  formaPagamentoSchema,
  acrescimoPagamento,
  dadosEntregaSchema,
  linhasSubmetidasSchema,
  montarMensagemWhatsApp,
  type ItemResumo,
  type LinhaSubmetida,
  type ResumoPedido,
} from "@/lib/pedido";

/** Resultado da conferência.
 *  * `errosCampos`  → problemas de formulário (mostrados no campo).
 *  * `problemas`    → problemas de sacola/estoque/rede (lista no
 *    topo; a cliente ajusta na sacola ou tenta de novo).
 *  * `resumo`       → conferência concluída: valores reais +
 *    link do WhatsApp oficial. NÃO é pedido registrado. */
export type ResultadoPreparar =
  | {
      ok: false;
      errosCampos?: Record<string, string>;
      problemas?: string[];
    }
  | { ok: true; resumo: ResumoPedido; urlWhatsApp: string };

export async function prepararPedido(
  _anterior: ResultadoPreparar | null,
  formData: FormData,
): Promise<ResultadoPreparar> {
  // ---------------------------------------------------------
  // 1) Linhas submetidas: só identificação e quantidade.
  // ---------------------------------------------------------
  const pagamento = formaPagamentoSchema.safeParse(formData.get("formaPagamento") ?? "pix");
  if (!pagamento.success) return { ok: false, errosCampos: { formaPagamento: "Escolha uma forma de pagamento válida." } };
  let linhas: LinhaSubmetida[] | null = null;
  let problemaLinhas: string | null = null;
  try {
    const bruto: unknown = JSON.parse(String(formData.get("itens") ?? "[]"));
    const resultado = linhasSubmetidasSchema.safeParse(bruto);
    if (resultado.success) {
      linhas = resultado.data;
    } else {
      problemaLinhas =
        resultado.error.issues[0]?.message ??
        "As peças enviadas não são válidas. Volte para a sacola e tente de novo.";
    }
  } catch {
    problemaLinhas =
      "Não foi possível ler a sacola enviada. Volte para a sacola e tente de novo.";
  }
  if (problemaLinhas !== null) {
    return { ok: false, problemas: [problemaLinhas] };
  }
  if (!linhas || linhas.length === 0) {
    return { ok: false, problemas: ["A sacola está vazia."] };
  }

  // ---------------------------------------------------------
  // 2) Dados da entrega — mesmas regras do contrato do banco.
  // ---------------------------------------------------------
  const entrega = dadosEntregaSchema.safeParse({
    nome: String(formData.get("nome") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    endereco: String(formData.get("endereco") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    uf: String(formData.get("uf") ?? ""),
    faixaFreteId: String(formData.get("faixaFreteId") ?? ""),
  });
  if (!entrega.success) {
    const errosCampos: Record<string, string> = {};
    for (const issue of entrega.error.issues) {
      const campo = String(issue.path[0] ?? "");
      if (campo && !errosCampos[campo]) {
        errosCampos[campo] = issue.message;
      }
    }
    return { ok: false, errosCampos };
  }

  // ---------------------------------------------------------
  // 3) Revalidação com o catálogo REAL: preço e estoque de agora.
  //    (Falha de rede NUNCA vira "peça indisponível".)
  // ---------------------------------------------------------
  const problemas: string[] = [];
  const itensResumo: ItemResumo[] = [];
  for (const linha of agruparPorVariacao(linhas)) {
    let produto = null;
    try {
      produto = await obterProduto(linha.produtoSlug);
    } catch (erro) {
      const mensagem =
        erro instanceof CatalogoErro
          ? erro.message
          : "Não foi possível conferir suas peças agora.";
      return { ok: false, problemas: [`${mensagem} Tente de novo em instantes.`] };
    }

    // Produto sumiu do catálogo (inativo ou removido).
    if (!produto) {
      problemas.push(
        `"${linha.produtoSlug}" saiu do catálogo. Remova esta peça da sacola para continuar.`,
      );
      continue;
    }

    if (produto.categoriaSlug === "desapego") {
      problemas.push(`${produto.nome}: a compra dos itens de Desapego é combinada pelo WhatsApp, com transporte ou retirada próprios. Remova este item da sacola de roupas para continuar.`);
      continue;
    }

    // A variação precisa existir DE FATO neste produto.
    const variacao = produto.variacoes.find((v) => v.id === linha.variacaoId);
    if (!variacao) {
      problemas.push(
        `${produto.nome}: o tamanho/cor escolhido não está mais disponível. Remova esta peça da sacola para continuar.`,
      );
      continue;
    }

    // Estoque atual (não é a foto guardada no navegador).
    if (linha.quantidade > variacao.quantidade) {
      problemas.push(
        `${produto.nome} (Tam. ${variacao.tamanho}, ${variacao.cor}): só há ${variacao.quantidade} em estoque agora — você separou ${linha.quantidade}. Ajuste a quantidade na sacola.`,
      );
      continue;
    }

    itensResumo.push({
      variacaoId: variacao.id,
      produtoSlug: produto.slug,
      produtoNome: produto.nome,
      tamanho: variacao.tamanho,
      cor: variacao.cor,
      quantidade: linha.quantidade,
      precoUnitario: produto.preco, // preço ATUAL do banco
    });
  }
  if (problemas.length > 0) {
    return { ok: false, problemas };
  }
  if (itensResumo.length === 0) {
    return { ok: false, problemas: ["A sacola está vazia."] };
  }

  // ---------------------------------------------------------
  // 4) Frete SEMPRE pelo banco — o navegador só envia o ID.
  // ---------------------------------------------------------
  let faixas = null;
  try {
    faixas = await listarFaixasFrete();
  } catch (erro) {
    const mensagem =
      erro instanceof FreteErro
        ? erro.message
        : "Não foi possível consultar as opções de entrega agora.";
    return { ok: false, problemas: [`${mensagem} Tente de novo em instantes.`] };
  }
  const faixa = faixas.find((f) => f.id === entrega.data.faixaFreteId);
  if (!faixa) {
    return {
      ok: false,
      errosCampos: { faixaFreteId: "Escolha a região de entrega." },
    };
  }

  // Fail-closed: além de ativa (lista acima), a faixa precisa ter
  // nome CONHECIDO pelo código (lista canônica) e ser COMPATÍVEL
  // com a UF informada. Faixa renomeada/inédita no banco, ou região
  // incompatível com o estado, BLOQUEIAM a finalização com erro
  // claro — nunca se cobra um valor "por aproximação". A retirada
  // no local vale para qualquer UF.
  if (!faixaConhecida(faixa.nome)) {
    return {
      ok: false,
      errosCampos: {
        faixaFreteId:
          "Esta região de entrega não está disponível agora. Tente novamente em instantes.",
      },
    };
  }
  if (!regiaoCompativelComUf(faixa.nome, entrega.data.uf)) {
    return {
      ok: false,
      errosCampos: {
        faixaFreteId: "A região escolhida não corresponde ao estado informado.",
      },
    };
  }

  // ---------------------------------------------------------
  // 5) Resumo com valores reais + link do WhatsApp OFICIAL.
  //    Nenhum pedido é registrado nesta etapa.
  // ---------------------------------------------------------
  // Frete grátis: a comparação usa o subtotal dos produtos em
  // CENTAVOS inteiros — R$ 129,99 paga a tarifa; R$ 130,00 é
  // grátis. A retirada no local é gratuita pela própria tarifa
  // zero do banco, em qualquer subtotal.
  const subtotalCentavos = itensResumo.reduce(
    (total, item) => total + paraCentavos(item.precoUnitario) * item.quantidade,
    0,
  );
  const subtotal = subtotalCentavos / 100;
  const acrescimoCentavos = acrescimoPagamento(subtotalCentavos, pagamento.data);
  const freteAplicado = calcularFreteAplicado(subtotalCentavos, faixa);
  const resumo: ResumoPedido = {
    itens: itensResumo,
    subtotal,
    formaPagamento: pagamento.data,
    acrescimoCartao: acrescimoCentavos / 100,
    frete: { id: faixa.id, nome: faixa.nome, valor: freteAplicado.valor },
    retirada: retiradaNoLocal(faixa.nome),
    total: (subtotalCentavos + acrescimoCentavos + paraCentavos(freteAplicado.valor)) / 100,
    entrega: entrega.data,
    mensagemWhatsApp: "",
  };
  resumo.mensagemWhatsApp = montarMensagemWhatsApp(resumo);

  return {
    ok: true,
    resumo,
    urlWhatsApp: linkWhatsApp(resumo.mensagemWhatsApp),
  };
}
