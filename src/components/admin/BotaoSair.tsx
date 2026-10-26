"use client";

// ============================================================
// DONA SIL — PAINEL — BOTÃO SAIR
// ============================================================
// Encerra a sessão de verdade: o Route Handler revoga os tokens
// no Supabase (POST /auth/v1/logout) e apaga os cookies httpOnly.
// Depois recarrega para /admin/login — o portão exige sessão
// novamente. Se a chamada falhar, a recarga acontece de qualquer
// forma e o cookie que sobrar expira sozinho.
// ============================================================

import { useState } from "react";
import { Botao } from "./Botao";

export default function BotaoSair({
  tamanho = "compacto",
}: {
  tamanho?: "normal" | "compacto";
}) {
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    if (saindo) return;
    setSaindo(true);
    try {
      await fetch("/api/admin/sessao", { method: "DELETE" });
    } catch {
      // segue para o login mesmo assim — o servidor fará a
      // limpeza no próximo acesso
    }
    // O portão (proxy) exige sessão no próximo acesso: sem
    // cookies, qualquer página do painel volta para o login.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A troca de sessão deve descartar o cache de navegação autenticado.
    window.location.assign("/admin/login");
  }

  return (
    <Botao
      variante="suave"
      tamanho={tamanho}
      onClick={sair}
      disabled={saindo}
      aria-label="Sair do painel"
    >
      {saindo ? "Saindo…" : "Sair"}
    </Botao>
  );
}
