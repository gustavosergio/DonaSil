// ============================================================
// DONA SIL — PORTÃO DO PAINEL (proxy do Next 16)
// ============================================================
// Toda rota /admin (exceto /admin/login) exige sessão:
//   * com cookie de acesso       → segue;
//   * sem ele, com renovação     → renova com o Supabase
//                                  (servidor ↔ servidor) e grava
//                                  os cookies novos;
//   * sem nenhum                 → redireciona para /admin/login
//                                  guardando o caminho de origem.
// /admin/login com sessão já ativa manda de volta para /admin.
//
// Este portão é ROTEAMENTO, não a segurança final: as páginas do
// painel hoje só exibem dados públicos do catálogo, e TODA escrita
// futura passará pelo Supabase de novo (RLS + existe_admin). A
// decisão de "quem é admin" acontece no login (servidor, via rpc
// existe_admin), e os tokens vivem em cookies httpOnly — o
// JavaScript do navegador não os lê.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_RENOVACAO,
  COOKIE_TOKEN,
  aplicarCookiesSessao,
  limparCookiesSessao,
  renovarSessaoPainel,
} from "@/lib/painel-auth";

export const config = {
  matcher: "/admin/:path*",
};

function ehRotaLogin(caminho: string): boolean {
  return caminho === "/admin/login" || caminho.startsWith("/admin/login/");
}

function temValor(request: NextRequest, nome: string): boolean {
  return (request.cookies.get(nome)?.value ?? "").length > 0;
}

/** URL do login, guardando o destino (?proximo=…) e o motivo. */
function urlLogin(request: NextRequest, motivo: "expirada" | null): URL {
  const destino = new URL("/admin/login", request.url);
  destino.searchParams.set(
    "proximo",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  if (motivo) destino.searchParams.set("motivo", motivo);
  return destino;
}

export async function proxy(request: NextRequest) {
  const caminho = request.nextUrl.pathname;

  // Página de login: sem sessão → renderiza; com sessão → /admin.
  if (ehRotaLogin(caminho)) {
    if (temValor(request, COOKIE_TOKEN)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Páginas do painel: sessão de acesso presente → segue.
  if (temValor(request, COOKIE_TOKEN)) {
    return NextResponse.next();
  }

  // Sem acesso, mas com renovação → troca por tokens novos.
  if (temValor(request, COOKIE_RENOVACAO)) {
    const renovacao = request.cookies.get(COOKIE_RENOVACAO)?.value ?? "";
    const resultado = await renovarSessaoPainel(renovacao);

    if (resultado.resultado === "ok") {
      const resposta = NextResponse.next();
      aplicarCookiesSessao(resposta, resultado.sessao);
      return resposta;
    }

    // Renovação recusada (token rotacionado/expirado/revogado):
    // a sessão acabou — limpa tudo e pede novo login.
    const resposta = NextResponse.redirect(urlLogin(request, "expirada"));
    limparCookiesSessao(resposta);
    return resposta;
  }

  // Sem sessão nenhuma → login.
  return NextResponse.redirect(urlLogin(request, null));
}
