// ============================================================
// DONA SIL — PAINEL — ESTADO VAZIO
// ============================================================
// Cartão para seções sem dados: ícone, título, explicação e
// espaço para uma ação (botão/link) quando fizer sentido.
// ============================================================

import type { ReactNode } from "react";
import { IconeCaixa } from "./Icones";

export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sand bg-ivory px-6 py-14 text-center">
      <IconeCaixa className="mx-auto h-10 w-10 text-gold-soft" />
      <p className="mt-4 font-display text-xl font-semibold text-ink">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">{descricao}</p>
      {acao && <div className="mt-6 flex justify-center">{acao}</div>}
    </div>
  );
}
