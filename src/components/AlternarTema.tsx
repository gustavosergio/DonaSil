"use client";

// ============================================================
// DONA SIL — ALTERNAR TEMA (claro / escuro)
// ============================================================
// Botão de sol/lua usado no cabeçalho público e no painel.
//
//   * A preferência fica salva no navegador (localStorage,
//     chave "donasil-tema") e vale entre visitas.
//     — "claro"  |  "escuro"
//   * Sem escolha salva, a primeira visita segue a preferência
//     do sistema (prefers-color-scheme).
//   * O tema é a classe .dark no <html>; o script anti-flash do
//     layout raiz já a aplica antes da página aparecer.
//   * A leitura usa useSyncExternalStore: a fonte da verdade é o
//     próprio <html>, observado por MutationObserver — assim os
//     dois botões (cabeçalho e menu) ficam sempre em sincronia.
// ============================================================

import { useCallback, useSyncExternalStore } from "react";

const CHAVE_TEMA = "donasil-tema";

/** Observa trocas da classe .dark no <html> e avisa o React. */
function inscrever(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observador.disconnect();
}

/** Estado atual, direto do navegador. */
function lerEscuro() {
  return document.documentElement.classList.contains("dark");
}

/** No servidor não existe DOM — assume claro (o script anti-flash
 *  corrige a classe antes da página aparecer). */
function lerEscuroServidor() {
  return false;
}

export default function AlternarTema({ className }: { className?: string }) {
  const escuro = useSyncExternalStore(inscrever, lerEscuro, lerEscuroServidor);

  const alternar = useCallback(() => {
    const novoEscuro = !lerEscuro();
    document.documentElement.classList.toggle("dark", novoEscuro);
    try {
      window.localStorage.setItem(
        CHAVE_TEMA,
        novoEscuro ? "escuro" : "claro",
      );
    } catch {
      // Armazenamento bloqueado: a escolha vale só para esta visita.
    }
  }, []);

  const rotulo = escuro ? "Mudar para modo claro" : "Mudar para modo escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={escuro}
      className={
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-champagne hover:text-gold-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
        (className ?? "")
      }
    >
      {escuro ? (
        // Sol: o tema atual é escuro, o botão oferece o claro.
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      ) : (
        // Lua: o tema atual é claro, o botão oferece o escuro.
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
