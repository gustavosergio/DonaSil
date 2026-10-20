// ============================================================
// DONA SIL — PAINEL — BOTÕES PADRÃO
// ============================================================
// Duas versões da mesma aparência:
//   * BotaoLink  → navegação (componente Link do Next)
//   * Botao      → ações de formulário/interação (<button>)
// ============================================================

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Route } from "next";

export type VarianteBotao = "primario" | "secundario" | "suave";
export type TamanhoBotao = "normal" | "compacto";

function classes(variante: VarianteBotao, tamanho: TamanhoBotao): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60";

  const variantes: Record<VarianteBotao, string> = {
    primario: "bg-gold text-ink hover:bg-gold-deep dark:text-[#2b2420]",
    secundario: "border border-gold text-gold-ink hover:bg-champagne",
    suave: "border border-sand bg-ivory text-ink-soft hover:border-gold hover:text-gold-ink",
  };

  const tamanhos: Record<TamanhoBotao, string> = {
    normal: "px-5 py-2.5 text-sm",
    compacto: "px-3.5 py-1.5 text-xs",
  };

  return `${base} ${variantes[variante]} ${tamanhos[tamanho]}`;
}

export function BotaoLink({
  href,
  variante = "primario",
  tamanho = "normal",
  className,
  children,
}: {
  href: Route;
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${classes(variante, tamanho)} ${className ?? ""}`}>
      {children}
    </Link>
  );
}

export function Botao({
  variante = "primario",
  tamanho = "normal",
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
}) {
  return (
    <button type="button" className={`${classes(variante, tamanho)} ${className ?? ""}`} {...props}>
      {children}
    </button>
  );
}
