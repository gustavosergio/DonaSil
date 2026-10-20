"use client";

// ============================================================
// DONA SIL — ETAPA 5b — SELECIONAR VARIAÇÃO E ADICIONAR À SACOLA
// ============================================================
// Ilha cliente da página de detalhe. Recebe os dados do produto
// já validados pelo servidor (Server Component) — inclusive o
// estoque de cada variação, direto do banco.
//
// Regras:
//   * Variações esgotadas (quantidade = 0) aparecem, mas ficam
//     DESABILITADAS — impossível selecionar.
//   * Quantidade limitada ao estoque da variação e ao teto de
//     10 unidades (limite do banco).
//   * O preço exibido vem do servidor; a sacola guarda apenas
//     uma FOTO do momento — será revalidada na finalização.
// ============================================================

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VariacaoEstoque } from "@/lib/catalogo";
import { LIMITE_UNIDADES_POR_ITEM } from "@/lib/pedido";
import { useSacola } from "@/components/CarrinhoProvider";

type Props = {
  produto: {
    slug: string;
    nome: string;
    preco: number;
  };
  variacoes: VariacaoEstoque[];
};

export default function AdicionarASacola({ produto, variacoes }: Props) {
  const { adicionar } = useSacola();

  // Produto com uma única variação disponível já nasce selecionado.
  const unico =
    variacoes.length === 1 && variacoes[0].quantidade > 0
      ? variacoes[0]
      : null;

  const [tamanho, setTamanho] = useState<string | null>(unico?.tamanho ?? null);
  const [variacaoId, setVariacaoId] = useState<string | null>(unico?.id ?? null);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  const tamanhos = useMemo(() => {
    const lista: string[] = [];
    for (const variacao of variacoes) {
      if (!lista.includes(variacao.tamanho)) {
        lista.push(variacao.tamanho);
      }
    }
    return lista;
  }, [variacoes]);

  const doTamanho = useMemo(
    () =>
      tamanho === null
        ? []
        : variacoes.filter((variacao) => variacao.tamanho === tamanho),
    [variacoes, tamanho],
  );

  const selecionada =
    variacoes.find((variacao) => variacao.id === variacaoId) ?? null;

  const maxQuantidade = selecionada
    ? Math.min(LIMITE_UNIDADES_POR_ITEM, selecionada.quantidade)
    : 1;

  const algumaDisponivel = variacoes.some((variacao) => variacao.quantidade > 0);

  function escolherTamanho(escolhido: string) {
    setTamanho(escolhido);
    setVariacaoId(null);
    setQuantidade(1);
    setAdicionado(false);
  }

  function escolherVariacao(variacao: VariacaoEstoque) {
    setVariacaoId(variacao.id);
    setQuantidade(1);
    setAdicionado(false);
  }

  function aumentar() {
    setQuantidade((atual) => Math.min(maxQuantidade, atual + 1));
    setAdicionado(false);
  }

  function diminuir() {
    setQuantidade((atual) => Math.max(1, atual - 1));
    setAdicionado(false);
  }

  function adicionarASacola() {
    if (!selecionada) return;
    adicionar({
      variacaoId: selecionada.id,
      produtoSlug: produto.slug,
      produtoNome: produto.nome,
      tamanho: selecionada.tamanho,
      cor: selecionada.cor,
      precoUnitario: produto.preco,
      quantidade,
      estoqueNoMomento: selecionada.quantidade,
    });
    setAdicionado(true);
  }

  if (!algumaDisponivel) {
    return (
      <div className="rounded-2xl border border-sand bg-ivory px-4 py-4">
        <p className="text-sm font-semibold text-ink">Tamanhos e cores</p>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          Todas as variações desta peça estão esgotadas agora. Volte
          em breve ou fale com a gente no WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sand bg-ivory px-4 py-4">
      <p className="text-sm font-semibold text-ink">Tamanhos e cores</p>

      {/* Tamanhos */}
      <fieldset className="mt-3">
        <legend className="text-xs uppercase tracking-wide text-ink-soft">
          Tamanho
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {tamanhos.map((opcao) => (
            <label
              key={opcao}
              className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition ${
                tamanho === opcao
                  ? "border-gold bg-gold font-medium text-ink dark:text-[#2b2420]"
                  : "border-sand bg-cream text-ink-soft hover:border-gold"
              }`}
            >
              <input
                type="radio"
                name="tamanho"
                className="sr-only"
                checked={tamanho === opcao}
                onChange={() => escolherTamanho(opcao)}
              />
              {opcao}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Cores do tamanho escolhido */}
      {tamanho !== null && (
        <fieldset className="mt-4">
          <legend className="text-xs uppercase tracking-wide text-ink-soft">
            Cor
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {doTamanho.map((variacao) => {
              const esgotada = variacao.quantidade === 0;
              return (
                <label
                  key={variacao.id}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    esgotada
                      ? "cursor-not-allowed border-sand bg-cream text-ink-soft/60"
                      : variacaoId === variacao.id
                        ? "cursor-pointer border-gold bg-gold font-medium text-ink dark:text-[#2b2420]"
                        : "cursor-pointer border-sand bg-cream text-ink-soft hover:border-gold"
                  }`}
                  title={esgotada ? "Esgotada" : variacao.cor}
                >
                  <input
                    type="radio"
                    name="cor"
                    className="sr-only"
                    disabled={esgotada}
                    checked={variacaoId === variacao.id}
                    onChange={() => escolherVariacao(variacao)}
                  />
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: variacao.corHex }}
                  />
                  {variacao.cor}
                  {esgotada && <span className="text-xs">— esgotada</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Quantidade */}
      <div className="mt-5 flex items-center gap-3">
        <span className="text-sm font-semibold text-ink">Quantidade</span>
        <div className="flex items-center gap-1 rounded-full border border-sand bg-cream p-1">
          <button
            type="button"
            onClick={diminuir}
            disabled={quantidade <= 1}
            aria-label="Diminuir quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm font-medium text-ink">
            {quantidade}
          </span>
          <button
            type="button"
            onClick={aumentar}
            disabled={!selecionada || quantidade >= maxQuantidade}
            aria-label="Aumentar quantidade"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        {selecionada && (
          <span className="text-xs text-ink-soft">
            {selecionada.quantidade} em estoque
          </span>
        )}
      </div>

      {/* Adicionar */}
      <button
        type="button"
        onClick={adicionarASacola}
        disabled={!selecionada}
        className="mt-5 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#2b2420]"
      >
        Adicionar à sacola
      </button>

      {adicionado && (
        <p role="status" className="mt-3 text-sm leading-7 text-ink-soft">
          Adicionado à sacola.{" "}
          <Link
            href="/sacola"
            className="font-medium text-gold-ink underline hover:no-underline"
          >
            Ver sacola
          </Link>
        </p>
      )}
    </div>
  );
}
