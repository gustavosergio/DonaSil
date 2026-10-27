"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { linkWhatsApp } from "@/lib/whatsapp";
import { useSacola } from "@/components/CarrinhoProvider";
import AlternarTema from "@/components/AlternarTema";

const MENSAGEM_ATENDIMENTO =
  "Olá! Vim pelo site da Dona Sil e gostaria de saber mais sobre as peças.";

function LinkSacola({ aoNavegar }: { aoNavegar?: () => void }) {
  const { carregado, unidades } = useSacola();

  // `pronto` não é estado — é o "estou no navegador?" canônico do
  // React: durante a SSR e a hidratação deste componente vale o
  // snapshot do servidor (false) e só depois da montagem passa a
  // ler o do cliente (true). Assim o badge e o aria-label têm
  // sempre o mesmo valor inicial nos dois lados, mesmo que o
  // efeito do CarrinhoProvider (leitura do localStorage) tenha
  // rodado antes de este trecho hidratar — o Header desce de um
  // limite de Suspense transmitido em streaming. (Sem setState em
  // efeito — regra react-hooks/set-state-in-effect.)
  const pronto = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const comContador = pronto && carregado && unidades > 0;

  return (
    <Link
      href="/sacola"
      onClick={aoNavegar}
      aria-label={
        comContador
          ? `Sacola (${unidades} ${unidades === 1 ? "peça" : "peças"})`
          : "Sacola"
      }
      className="relative flex items-center gap-2 text-ink-soft transition hover:text-gold-ink"
    >
      Sacola
      {comContador && (
        <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-ivory">
          {unidades}
        </span>
      )}
    </Link>
  );
}

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 md:justify-start md:gap-10 lg:gap-12">
        <Link
          href="/"
          className="shrink-0 font-display text-2xl font-semibold text-gold-ink"
          aria-label="Dona Sil — página inicial"
        >
          Dona Sil
        </Link>

        <nav
          className="hidden items-center gap-6 text-sm font-medium md:flex"
          aria-label="Navegação principal"
        >
          <Link href="/" className="text-ink-soft transition hover:text-gold-ink">
            Início
          </Link>
          <Link href="/catalogo" className="text-ink-soft transition hover:text-gold-ink">
            Catálogo
          </Link>
          <Link href="/desapego" className="text-ink-soft transition hover:text-gold-ink">Desapego</Link>
          <LinkSacola />
          <AlternarTema />
          <a
            href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#15803d] px-5 py-2 text-white transition hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803d]"
          >
            WhatsApp
          </a>
        </nav>

        {/* Celular e tablet estreito (<768px): tema e menu na mesma extremidade da
            barra — o tema NÃO depende de o menu estar aberto.
            No desktop (≥768px) o conjunto some: o tema já aparece
            na navegação e o menu vira hambúrguer escondido. */}
        <div className="flex items-center gap-1 md:hidden">
          <AlternarTema />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-champagne"
            aria-expanded={menuAberto}
            aria-controls="menu-mobile"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              {menuAberto ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuAberto && (
        <nav
          id="menu-mobile"
          className="border-t border-sand bg-ivory px-4 py-4 md:hidden"
          aria-label="Navegação principal"
        >
          <ul className="flex flex-col gap-1 text-sm font-medium">
            <li>
              <Link
                href="/"
                className="block rounded-lg px-3 py-3 text-ink transition hover:bg-champagne"
                onClick={() => setMenuAberto(false)}
              >
                Início
              </Link>
            </li>
            <li>
              <Link
                href="/catalogo"
                className="block rounded-lg px-3 py-3 text-ink transition hover:bg-champagne"
                onClick={() => setMenuAberto(false)}
              >
                Catálogo
              </Link>
            </li>
            <li><Link href="/desapego" onClick={() => setMenuAberto(false)} className="block rounded-lg px-3 py-3 text-ink transition hover:bg-champagne">Desapego</Link></li>
            <li>
              <div className="rounded-lg px-3 py-3 transition hover:bg-champagne">
                <LinkSacola aoNavegar={() => setMenuAberto(false)} />
              </div>
            </li>
            <li className="mt-2">
              <a
                href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full bg-[#15803d] px-5 py-3 text-center text-white transition hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#15803d]"
              >
                Falar no WhatsApp
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
