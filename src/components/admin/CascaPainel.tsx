"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Envolve o conteúdo do painel. Na tela de entrada (/admin/login)
 * o menu lateral não existe (o NavPainel se esconde lá) — por isso
 * a margem que reserva o menu também precisa sumir.
 * Componente de cliente porque lê a rota atual (usePathname).
 */
export default function CascaPainel({ children }: { children: ReactNode }) {
  const caminho = usePathname();

  if (caminho === "/admin/login") return <>{children}</>;

  return <div className="md:ml-64">{children}</div>;
}
