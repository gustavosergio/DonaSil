"use client";

// ============================================================
// DONA SIL — PAINEL — ERRO
// ============================================================
// Fronteira de erro das rotas /admin. Exibe mensagem clara e o
// botão "Tentar de novo" (reexecuta a renderização da seção).
// ============================================================

import { useEffect } from "react";
import { Botao } from "@/components/admin/Botao";

export default function ErroPainel({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-sand bg-ivory px-6 py-14 text-center"
    >
      <p className="font-display text-xl font-semibold text-ink">
        Algo deu errado nesta seção
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
        Não foi possível carregar o conteúdo agora. Tente de novo em
        alguns instantes — nada foi alterado no site ou no banco.
      </p>
      <div className="mt-6 flex justify-center">
        <Botao onClick={retry}>Tentar de novo</Botao>
      </div>
    </div>
  );
}
