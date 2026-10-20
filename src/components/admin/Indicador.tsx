// ============================================================
// DONA SIL — PAINEL — INDICADORES DA VISÃO GERAL
// ============================================================
// Cartão com número + rótulo + nota explicativa.
// Quando um valor ainda não tem fonte de dados (pedidos, por
// exemplo), o valor entra como "—" e a nota explica o motivo —
// nunca um número inventado.
// ============================================================

import Link from "next/link";
import type { ReactNode } from "react";
import type { Route } from "next";

export function Indicador({
  valor,
  rotulo,
  nota,
  href,
}: {
  valor: ReactNode;
  rotulo: string;
  nota?: string;
  href?: Route;
}) {
  const corpo = (
    <>
      <p className="font-display text-4xl font-semibold text-ink">{valor}</p>
      <p className="mt-1 text-sm font-medium text-ink">{rotulo}</p>
      {nota && <p className="mt-1 text-xs leading-5 text-ink-soft">{nota}</p>}
    </>
  );

  const classe =
    "block rounded-2xl border border-sand bg-ivory px-6 py-5 transition hover:border-gold";

  if (href) {
    return (
      <Link href={href} className={classe}>
        {corpo}
      </Link>
    );
  }
  return <div className={classe}>{corpo}</div>;
}
