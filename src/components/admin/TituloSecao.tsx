// ============================================================
// DONA SIL — PAINEL — TÍTULO DE SEÇÃO
// ============================================================
// Cabeçalho padrão das páginas do painel: título grande com a
// fonte display da marca, descrição em tom suave e espaço para
// ações (botões) alinhadas à direita.
// ============================================================

import type { ReactNode } from "react";

export function TituloSecao({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">{titulo}</h1>
        {descricao && <p className="mt-2 max-w-xl text-sm leading-7 text-ink-soft">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 gap-2">{acoes}</div>}
    </header>
  );
}
