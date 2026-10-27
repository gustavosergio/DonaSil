import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MODO_DEMO } from "@/lib/site";
import { FreteErro, listarFaixasFrete, type FaixaFrete } from "@/lib/frete";
import FinalizarPedido from "@/components/FinalizarPedido";
import { cotacaoConfigurada } from "@/lib/melhor-envio";

// Página pessoal da compradora (sacola/entrega): não indexar.
export const metadata: Metadata = {
  title: "Finalizar pedido",
  description:
    "Confira as peças separadas, informe a entrega e conclua o pedido com o atendimento da Dona Sil pelo WhatsApp.",
  robots: { index: false },
};

export default function PaginaFinalizar() {
  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">
          Finalizar pedido
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          Confira as peças, informe os dados de entrega e a gente
          conclui tudo com você pelo WhatsApp.
        </p>
        {MODO_DEMO && (
          <p className="mt-3 rounded-2xl border border-sand bg-ivory px-4 py-3 text-xs leading-6 text-ink-soft">
            Site em modo demonstração: nomes, preços e fotos do
            catálogo são exemplos fictícios até a publicação oficial.
          </p>
        )}
      </header>

      <Suspense fallback={<EsqueletoFinalizar />}>
        <ConteudoFinalizar />
      </Suspense>
    </main>
  );
}

/** Busca as faixas de frete ATIVAS no banco. Falha de rede nunca
 *  vira lista vazia: mostra o erro e deixa a cliente recarregar. */
async function ConteudoFinalizar() {
  let faixas: FaixaFrete[] = [];
  let erro: string | null = null;
  try {
    faixas = await listarFaixasFrete();
  } catch (excecao) {
    erro =
      excecao instanceof FreteErro
        ? excecao.message
        : "Não foi possível carregar as opções de entrega agora.";
  }

  if (erro !== null) {
    return (
      <div
        role="alert"
        className="mt-8 rounded-3xl border border-sand bg-ivory px-6 py-14 text-center"
      >
        <p className="font-display text-xl font-semibold text-ink">
          Não foi possível carregar a entrega
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
          {erro} Recarregue a página em alguns instantes ou volte à
          sacola.
        </p>
        <Link
          href="/sacola"
          className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
        >
          Voltar à sacola
        </Link>
      </div>
    );
  }

  return <FinalizarPedido faixas={faixas} cotacaoDisponivel={cotacaoConfigurada()} />;
}

function EsqueletoFinalizar() {
  return (
    <div aria-hidden="true" className="mt-8 space-y-4">
      <div className="h-40 animate-pulse rounded-3xl bg-champagne" />
      <div className="h-64 animate-pulse rounded-3xl bg-champagne" />
    </div>
  );
}
