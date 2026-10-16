import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Catálogo de moda feminina da Dona Sil — em preparação, chega em breve.",
};

export default function PaginaCatalogo() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-wine">
        Em preparação
      </p>
      <h1 className="font-display text-4xl font-semibold text-ink">
        Catálogo
      </h1>
      <p className="max-w-md leading-8 text-ink-soft">
        O catálogo completo chega em breve, com filtros por categoria,
        tamanho, cor e faixa de preço, busca e fotos de cada peça.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full border border-wine px-6 py-3 text-sm font-medium text-wine transition hover:bg-champagne"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
