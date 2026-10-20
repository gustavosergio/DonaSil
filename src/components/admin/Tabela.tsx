// ============================================================
// DONA SIL — PAINEL — TABELAS PADRÃO
// ============================================================
// Envoltórios finos que aplicam a mesma aparência (bordas
// suaves, tipografia pequena e rolagem horizontal em telas
// estreitas) em todas as listas do painel.
// ============================================================

import type { ComponentProps, ReactNode } from "react";

export function Tabela({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-sand bg-ivory">
      <table className="w-full min-w-[36rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={`border-b border-sand px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-soft ${className ?? ""}`}
      scope="col"
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={`border-b border-sand/60 px-4 py-3 text-ink ${className ?? ""}`} {...props} />;
}
