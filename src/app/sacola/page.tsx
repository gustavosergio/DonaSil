import type { Metadata } from "next";
import ConteudoSacola from "@/components/ConteudoSacola";

export const metadata: Metadata = {
  title: "Sacola",
  description:
    "As peças que você separou na Dona Sil. Preços e estoque são confirmados na finalização.",
  // Página pessoal da compradora: não indexar em buscadores.
  robots: { index: false },
};

export default function PaginaSacola() {
  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6"
    >
      <header>
        <h1 className="font-display text-4xl font-semibold text-ink">
          Sua sacola
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          Revise as peças separadas. Você ajusta quantidades e pode
          remover o que quiser antes da finalização.
        </p>
      </header>

      <ConteudoSacola />
    </main>
  );
}
