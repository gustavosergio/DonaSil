"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Esconde o cabeçalho e o rodapé do site público
 * quando a rota atual é do painel administrativo (/admin).
 *
 * O painel tem a própria navegação; o "chrome" público da loja não
 * deve aparecer lá. Componente de cliente porque precisa ler a rota
 * atual (usePathname) — os filhos continuam componentes de servidor.
 */
export default function MostrarForaDoPainel({ children }: { children: ReactNode }) {
  const caminho = usePathname();

  if (caminho?.startsWith("/admin")) return null;
  return <>{children}</>;
}
