// ============================================================
// DONA SIL — PAINEL — AVISOS
// ============================================================
// Faixa horizontal usada para mensagens importantes: recursos
// que ainda não estão conectados ao banco, modo demonstração
// e explicações sobre as próximas etapas.
// ============================================================

import type { ReactNode } from "react";

const TONALIDADES = {
  info: "border-l-4 border-gold bg-champagne/50",
  atencao: "border-l-4 border-gold-deep bg-sand",
} as const;

export function Aviso({
  tonalidade = "info",
  titulo,
  children,
}: {
  tonalidade?: keyof typeof TONALIDADES;
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${TONALIDADES[tonalidade]} rounded-r-2xl px-5 py-4 text-sm leading-6 text-ink`}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children}
    </div>
  );
}
