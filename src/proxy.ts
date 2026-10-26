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
  verificarAdminPainel,
} from "@/lib/painel-auth";

export const config = {
  matcher: "/admin/:path*",
};

function ehRotaLogin(caminho: string): boolean {
  return caminho === "/admin/login" || caminho.startsWith("/admin/login/");
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
  const login = ehRotaLogin(caminho);
  const token = request.cookies.get(COOKIE_TOKEN)?.value ?? "";
  const renovacao = request.cookies.get(COOKIE_RENOVACAO)?.value ?? "";

  // A presença de um cookie não comprova sessão: o banco valida
  // o token e o vínculo administrativo em cada entrada no painel.
  if (token && await verificarAdminPainel(token) === "admin") {
    if (login) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }
  if (renovacao) {
    const resultado = await renovarSessaoPainel(renovacao);
    if (resultado.resultado === "ok" &&
        await verificarAdminPainel(resultado.sessao.access_token) === "admin") {
      // A página desta mesma requisição já deve ler os tokens novos.
      request.cookies.set(COOKIE_TOKEN, resultado.sessao.access_token);
      request.cookies.set(COOKIE_RENOVACAO, resultado.sessao.refresh_token);
      const resposta = login
        ? NextResponse.redirect(new URL("/admin", request.url))
        : NextResponse.next({ request: { headers: new Headers(request.headers) } });
      aplicarCookiesSessao(resposta, resultado.sessao);
      return resposta;
    }
  }
  const resposta = login ? NextResponse.next()
    : NextResponse.redirect(urlLogin(request, token || renovacao ? "expirada" : null));
  if (token || renovacao) limparCookiesSessao(resposta);
  return resposta;
}
