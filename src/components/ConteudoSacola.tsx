"use client";

// ============================================================
// DONA SIL — ETAPA 5b — CONTEÚDO DA PÁGINA /sacola
// ============================================================
// Estados possíveis:
//   * carregando  → esqueleto (antes de ler o localStorage).
//   * vazia       → convite para conhecer o catálogo.
//   * com itens   → lista com controles de quantidade/remoção.
//
// Itens marcados como INDISPONÍVEL (estoque zero na foto do
// momento da inclusão) aparecem destacados: só saem da sacola
// quando a cliente remove — nada é apagado por conta própria.
//
// M1: quantidade acima da FOTO de estoque nunca sobe em
// silêncio — a linha mostra aviso + botão "Ajustar".
// M3: saneamento do storage (itens inválidos/ajustados) aparece
// no banner `aviso` (role="status"), com botão Fechar.
//
// Preços e estoque aqui são INFORMATIVOS: serão conferidos de
// novo no servidor antes de qualquer pedido (Etapa 5c+).
// ============================================================

import Link from "next/link";
import { formatarBRL } from "@/lib/format";
import { tetoDoItem } from "@/lib/pedido";
import { useSacola } from "@/components/CarrinhoProvider";

export default function ConteudoSacola() {
  const {
    itens,
    carregado,
    aviso,
    subtotal,
    mudarQuantidade,
    remover,
    limpar,
    dispensarAviso,
  } = useSacola();

  if (!carregado) {
    return (
      <div
        aria-hidden="true"
        className="mt-8 space-y-4"
      >
        {[0, 1].map((linha) => (
          <div
            key={linha}
            className="h-28 animate-pulse rounded-2xl bg-champagne"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8">
      {/* Aviso de saneamento (M3): dados salvos foram corrigidos,
          descartados ou limitados ao carregar. Mensagem genérica —
          nunca expõe o conteúdo bruto do armazenamento. */}
      {aviso && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold bg-champagne px-4 py-3 text-sm text-ink"
        >
          <p>{aviso}</p>
          <button
            type="button"
            onClick={dispensarAviso}
            className="shrink-0 font-medium text-gold-ink underline underline-offset-2 transition hover:no-underline"
          >
            Fechar
          </button>
        </div>
      )}

      {itens.length === 0 ? (
        <div className="rounded-3xl border border-sand bg-ivory px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            Sua sacola está vazia
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
            Que tal conhecer as peças da coleção? Separe suas favoritas
            aqui na sacola.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
          >
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {itens.map((item) => {
              const indisponivel = item.estoqueNoMomento <= 0;
              // Teto real da linha: menor valor entre 10 unidades e
              // a FOTO de estoque (M1). Foto é registro antigo — o
              // estoque de verdade é conferido no servidor na
              // finalização.
              const cap = tetoDoItem(item);
              const acimaDoRegistrado =
                item.estoqueNoMomento > 0 &&
                item.quantidade > item.estoqueNoMomento;
              const maximo = item.estoqueNoMomento > 0 ? cap : 1;
              return (
                <li
                  key={item.variacaoId}
                  className="rounded-2xl border border-sand bg-ivory px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/catalogo/${item.produtoSlug}`}
                        className="font-medium text-ink hover:text-gold-ink"
                      >
                        {item.produtoNome}
                      </Link>
                      <p className="mt-1 text-sm text-ink-soft">
                        Tamanho {item.tamanho} — cor {item.cor}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {formatarBRL(item.precoUnitario)} cada
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {formatarBRL(item.precoUnitario * item.quantidade)}
                    </p>
                  </div>

                  {indisponivel ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink-soft">
                        Indisponível
                      </span>
                      <span className="text-xs leading-6 text-ink-soft">
                        Esta variação ficou sem estoque desde que você a
                        separou.
                      </span>
                    </div>
                  ) : null}

                  {/* Quantidade acima da foto de estoque (M1): aviso
                      claro + ajuste em um toque. Nada é reduzido sem
                      a concordância de quem está comprando. */}
                  {acimaDoRegistrado && (
                    <div className="mt-3 rounded-xl border border-gold bg-champagne px-3 py-2 text-xs leading-6 text-ink">
                      <p>
                        Você separou {item.quantidade}, mas o estoque
                        registrado quando incluiu esta variação era{" "}
                        {item.estoqueNoMomento}. O estoque real será
                        conferido na finalização.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          mudarQuantidade(item.variacaoId, cap)
                        }
                        className="mt-2 font-semibold text-gold-ink underline underline-offset-2 transition hover:no-underline"
                      >
                        Ajustar para {cap}
                      </button>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-full border border-sand bg-cream p-1">
                      <button
                        type="button"
                        onClick={() => mudarQuantidade(item.variacaoId, item.quantidade - 1)}
                        disabled={item.quantidade <= 1}
                        aria-label={`Diminuir quantidade de ${item.produtoNome}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm font-medium text-ink">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => mudarQuantidade(item.variacaoId, item.quantidade + 1)}
                        disabled={item.quantidade >= maximo}
                        aria-label={`Aumentar quantidade de ${item.produtoNome}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => remover(item.variacaoId)}
                      aria-label={`Remover ${item.produtoNome}, tamanho ${item.tamanho}, cor ${item.cor}, da sacola`}
                      className="text-sm font-medium text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Resumo informativo */}
          <div className="mt-8 rounded-3xl border border-sand bg-cream px-6 py-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">
                Subtotal (informativo)
              </p>
              <p className="font-display text-2xl font-semibold text-ink">
                {formatarBRL(subtotal)}
              </p>
            </div>
            <p className="mt-3 text-xs leading-6 text-ink-soft">
              A sacola fica só no seu navegador. Preços e estoque são
              conferidos de novo no servidor antes de qualquer pedido — o
              frete é calculado na finalização.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/finalizar"
                className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
              >
                Finalizar pedido
              </Link>
              <Link
                href="/catalogo"
                className="rounded-full border border-sand px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-ink"
              >
                Continuar comprando
              </Link>
              <button
                type="button"
                onClick={limpar}
                className="rounded-full border border-sand px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-ink"
              >
                Esvaziar sacola
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
