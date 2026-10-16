"use client";

import { useState } from "react";
import Link from "next/link";
import { linkWhatsApp } from "@/lib/whatsapp";

const MENSAGEM_ATENDIMENTO =
  "Olá! Vim pelo site da Dona Sil e gostaria de saber mais sobre as peças.";

export default function Header() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-2xl font-semibold text-wine"
          aria-label="Dona Sil — página inicial"
        >
          Dona Sil
        </Link>

        <nav
          className="hidden items-center gap-8 text-sm font-medium sm:flex"
          aria-label="Navegação principal"
        >
          <Link href="/" className="text-ink-soft transition hover:text-wine">
            Início
          </Link>
          <Link href="/catalogo" className="text-ink-soft transition hover:text-wine">
            Catálogo
          </Link>
          <a
            href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-wine px-5 py-2 text-white transition hover:bg-wine-deep"
          >
            WhatsApp
          </a>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-blush sm:hidden"
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

      {menuAberto && (
        <nav
          id="menu-mobile"
          className="border-t border-sand bg-ivory px-4 py-4 sm:hidden"
          aria-label="Navegação principal"
        >
          <ul className="flex flex-col gap-1 text-sm font-medium">
            <li>
              <Link
                href="/"
                className="block rounded-lg px-3 py-3 text-ink transition hover:bg-blush"
                onClick={() => setMenuAberto(false)}
              >
                Início
              </Link>
            </li>
            <li>
              <Link
                href="/catalogo"
                className="block rounded-lg px-3 py-3 text-ink transition hover:bg-blush"
                onClick={() => setMenuAberto(false)}
              >
                Catálogo
              </Link>
            </li>
            <li className="mt-2">
              <a
                href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full bg-wine px-5 py-3 text-center text-white transition hover:bg-wine-deep"
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
