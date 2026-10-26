import type { Metadata } from "next";
import Link from "next/link";
import { linkWhatsApp } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function PaginaNaoEncontrada() {
  return (
    <main id="conteudo" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 sm:py-24">
      <section aria-labelledby="titulo-404" className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-sand bg-ivory px-6 py-12 text-center sm:px-12 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-champagne/60" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-ink">Dona Sil · Erro 404</p>
          <div aria-hidden="true" className="mt-6 flex items-center justify-center gap-2 font-display text-8xl font-medium text-gold-ink sm:gap-4 sm:text-9xl">
            <span>4</span>
            <span className="flex h-24 w-20 items-center justify-center rounded-full border border-gold-soft bg-champagne sm:h-32 sm:w-28">
              <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
                <path d="M33 26a7 7 0 1 1 10 6c-2 1-3 3-3 6v3M40 41 12 58a3 3 0 0 0 2 5h52a3 3 0 0 0 2-5L40 41Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>4</span>
          </div>
          <h1 id="titulo-404" className="mt-8 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Essa página saiu da vitrine.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-ink-soft sm:text-base">Não encontramos o endereço que você tentou acessar. Ele pode ter mudado ou a peça pode ter saído do catálogo.</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/catalogo" className="rounded-full bg-gold px-7 py-3 text-sm font-semibold text-[#2b2420] transition hover:bg-gold-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Explorar o catálogo</Link>
            <Link href="/" className="rounded-full border border-gold px-7 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Voltar ao início</Link>
          </div>
          <p className="mt-8 text-xs leading-6 text-ink-soft">Procurando uma peça específica?{" "}<a href={linkWhatsApp("Olá! Não encontrei uma página no site da Dona Sil. Podem me ajudar a encontrar uma peça?")} target="_blank" rel="noopener noreferrer" className="font-medium text-gold-ink underline underline-offset-4">Fale com a gente no WhatsApp</a>.</p>
        </div>
      </section>
    </main>
  );
}
