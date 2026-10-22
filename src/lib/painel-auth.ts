// ============================================================
// DONA SIL — SESSÃO DO PAINEL (Supabase Auth via fetch nativo)
// ============================================================
// Usado por DOIS lugares:
//   * src/app/api/admin/sessao/route.ts — entrar/sair (grava os
//     cookies httpOnly da sessão);
//   * src/proxy.ts — portão das páginas /admin (renova a sessão
//     quando o token de acesso vence).
//
// Segurança:
//   * Usa apenas as variáveis públicas NEXT_PUBLIC_SUPABASE_URL e
//     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (a chave "anon" atual
//     do Supabase). A SUPABASE_SECRET_KEY não é lida em lugar
//     nenhum deste arquivo.
//   * Sem SDK: fetch nativo para a API REST do Supabase
//     (/auth/v1) e para o PostgREST (/rest/v1/rpc/existe_admin).
//   * Toda resposta é validada com Zod antes de ser usada.
//   * Este arquivo também roda dentro do proxy (runtime Node.js
//     do Next 16): nada de API exclusiva de servidor aqui.
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";

// ------------------------------------------------------------
// Cookies da sessão (httpOnly — o JavaScript do navegador não lê)
// ------------------------------------------------------------

export const COOKIE_TOKEN = "donasil-painel-token";
export const COOKIE_RENOVACAO = "donasil-painel-renovacao";

/** Validade local do cookie de renovação (30 dias). O Supabase
 *  pode recusar a renovação antes disso (política de rotação) —
 *  nesse caso o portão simplesmente pede um novo login. */
export const VALIDADE_RENOVACAO_SEGUNDOS = 60 * 60 * 24 * 30;

const TEMPO_LIMITE_MS = 10_000;

// ------------------------------------------------------------
// Configuração (apenas variáveis públicas)
// ------------------------------------------------------------

function configurar(): { url: string; chave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return null;
  return { url: url.replace(/\/+$/, ""), chave };
}

// ------------------------------------------------------------
// Schemas — espelham a resposta real do Supabase Auth
// ------------------------------------------------------------

const usuarioSchema = z.object({
  id: z.uuid(),
  email: z.string(),
});

const respostaSessaoSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  /** Segundos até o token de access expirar (vira o maxAge do cookie). */
  expires_in: z.number().int().positive(),
  expires_at: z.number(),
  token_type: z.string(),
  user: usuarioSchema,
});

export type SessaoSupabase = z.output<typeof respostaSessaoSchema>;

// ------------------------------------------------------------
// Resultados possíveis das chamadas de autenticação
// ------------------------------------------------------------

export type ResultadoEntrar =
  | { resultado: "ok"; sessao: SessaoSupabase }
  | { resultado: "configuracao" } // variáveis públicas ausentes
  | { resultado: "credenciais" } // e-mail/senha incorretos
  | { resultado: "email_nao_confirmado" } // conta existe, e-mail pendente
  | { resultado: "limite" } // excesso de tentativas (limite do Supabase)
  | { resultado: "conexao" }; // rede, 5xx ou resposta fora do schema

/** "admin" = confirmado pelo banco · "comum" = logado, sem acesso
 *  de painel · "falha" = não foi possível confirmar (falha fechada). */
export type ResultadoAdmin = "admin" | "comum" | "falha";

// ------------------------------------------------------------
// Pedido de tokens (login por senha OU renovação)
// ------------------------------------------------------------

async function pedirToken(
  tipoConcessao: "password" | "refresh_token",
  corpo: Record<string, string>,
): Promise<ResultadoEntrar> {
  const config = configurar();
  if (!config) return { resultado: "configuracao" };

  let resposta: Response;
  try {
    resposta = await fetch(
      `${config.url}/auth/v1/token?grant_type=${tipoConcessao}`,
      {
        method: "POST",
        headers: {
          apikey: config.chave,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
        cache: "no-store",
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      },
    );
  } catch {
    return { resultado: "conexao" };
  }

  if (!resposta.ok) {
    if (resposta.status === 429) return { resultado: "limite" };
    // O Supabase sinaliza e-mail pendente de confirmação no corpo
    // (error_code / msg). Qualquer outra recusa 4xx = credenciais.
    try {
      const bruto = (await resposta.json()) as Record<string, unknown>;
      const codigo = String(bruto.error_code ?? bruto.error ?? "");
      if (codigo.includes("email_not_confirmed")) {
        return { resultado: "email_nao_confirmado" };
      }
    } catch {
      // corpo ilegível → segue como credenciais inválidas
    }
    return { resultado: "credenciais" };
  }

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    return { resultado: "conexao" };
  }

  const sessao = respostaSessaoSchema.safeParse(bruto);
  if (!sessao.success) return { resultado: "conexao" };
  return { resultado: "ok", sessao: sessao.data };
}

/** Login por e-mail e senha (POST /auth/v1/token?grant_type=password). */
export function entrarPainel(email: string, senha: string): Promise<ResultadoEntrar> {
  return pedirToken("password", { email, password: senha });
}

/** Renovação da sessão com o token de renovação
 *  (POST /auth/v1/token?grant_type=refresh_token). */
export function renovarSessaoPainel(refreshToken: string): Promise<ResultadoEntrar> {
  return pedirToken("refresh_token", { refresh_token: refreshToken });
}

// ------------------------------------------------------------
// Confirmação de admin — decide o POSTGRES, não o navegador
// ------------------------------------------------------------

/**
 * Pergunta ao banco (via PostgREST) se o usuário do token é admin,
 * usando a função pública existente `existe_admin()`:
 *   * o Bearer é o token recém-emitido pelo Supabase — o Postgres
 *     verifica a assinatura e o papel `authenticated`;
 *   * `existe_admin()` confere a tabela `admin_usuarios`
 *     (SECURITY DEFINER, search_path vazio).
 * Sem o Bearer correto ou sem permissão de EXECUTE, a resposta é
 * "falha" — e o chamador NÃO abre a sessão (falha fechada).
 */
export async function verificarAdminPainel(accessToken: string): Promise<ResultadoAdmin> {
  const config = configurar();
  if (!config) return "falha";

  let resposta: Response;
  try {
    resposta = await fetch(`${config.url}/rest/v1/rpc/existe_admin`, {
      method: "POST",
      headers: {
        apikey: config.chave,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    return "falha";
  }

  if (!resposta.ok) return "falha";

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    return "falha";
  }

  return bruto === true ? "admin" : "comum";
}

// ------------------------------------------------------------
// Encerramento no Supabase (melhor esforço)
// ------------------------------------------------------------

/**
 * Revoga os tokens de renovação no Supabase (POST /auth/v1/logout).
 * Se a chamada falhar, os cookies locais são apagados de qualquer
 * forma — a sessão morre no navegador, e o token remanescente
 * expira sozinho pela política do Supabase.
 */
export async function encerrarSessaoSupabase(accessToken: string): Promise<void> {
  const config = configurar();
  if (!config) return;
  try {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: config.chave,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    // silencioso e proposital: o logout local acontece de todo jeito
  }
}

// ------------------------------------------------------------
// Cookies httpOnly — gravação e limpeza na resposta
// ------------------------------------------------------------

/** Grava os cookies da sessão (token + renovação) na resposta. */
export function aplicarCookiesSessao(resposta: NextResponse, sessao: SessaoSupabase): void {
  const seguro = process.env.NODE_ENV === "production";
  resposta.cookies.set({
    name: COOKIE_TOKEN,
    value: sessao.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    // O cookie expira JUNTO com o token de acesso; depois disso o
    // portão usa o cookie de renovação para trocar por tokens novos.
    maxAge: sessao.expires_in,
  });
  resposta.cookies.set({
    name: COOKIE_RENOVACAO,
    value: sessao.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure: seguro,
    path: "/",
    maxAge: VALIDADE_RENOVACAO_SEGUNDOS,
  });
}

/** Apaga os cookies da sessão da resposta (logout / renovação recusada). */
export function limparCookiesSessao(resposta: NextResponse): void {
  resposta.cookies.delete(COOKIE_TOKEN);
  resposta.cookies.delete(COOKIE_RENOVACAO);
}
