// ============================================================
// DONA SIL — PAINEL — RÓTULOS DE STATUS
// ============================================================
// "Selos" arredondados usados nas tabelas. As cores seguem a
// paleta da loja: nada de verde/vermelho de dashboard genérico.
// ============================================================

const TONALIDADES = {
  ativo: "border border-gold-soft bg-champagne text-gold-ink",
  esgotado: "bg-ink/70 text-ivory",
  pendente: "border border-sand bg-sand text-ink-soft",
  neutro: "border border-sand bg-ivory text-ink-soft",
} as const;

export type TonalidadeRotulo = keyof typeof TONALIDADES;

export function RotuloStatus({
  tonalidade = "neutro",
  children,
}: {
  tonalidade?: TonalidadeRotulo;
  children: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONALIDADES[tonalidade]}`}
    >
      {children}
    </span>
  );
}
