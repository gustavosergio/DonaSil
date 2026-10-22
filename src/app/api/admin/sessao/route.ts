// ============================================================
// DONA SIL — API DA SESSÃO DO PAINEL
// ============================================================
// POST   /api/admin/sessao  → entrar (e-mail + senha)
// DELETE /api/admin/sessao  → sair
//
// O fluxo de entrada acontece INTEIRO no servidor:
//   1. pede os tokens ao Supabase Auth (fetch nativo);
//   2. confere com o banco se o usuário é admin (rpc existe_admin,
//      com o Bearer recém-emitido — quem decide é o Postgres);
//   3. só então grava os cookies httpOnly da sessão.
// Conta sem acesso de admin recebe 403 e NENHUM cookie — e a
// sessão recém-criada no Supabase é revogada na hora.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  COOKIE_TOKEN,
  aplicarCookiesSessao,
  encerrarSessaoSupabase,
  entrarPainel,
  limparCookiesSessao,
  verificarAdminPainel,
} from "@/lib/painel-auth";

const corpoSchema = z.object({
  email: z.email(),
  senha: z.string().min(1),
});

function respostaErro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

// ------------------------------------------------------------
// POST — entrar
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return respostaErro(400, "Informe o e-mail e a senha para entrar.");
  }

  const corpo = corpoSchema.safeParse(bruto);
  if (!corpo.success) {
    return respostaErro(400, "Informe um e-mail válido e a senha.");
  }

  const login = await entrarPainel(corpo.data.email, corpo.data.senha);
  if (login.resultado === "configuracao") {
    return respostaErro(500, "O painel não está configurado neste ambiente.");
  }
  if (login.resultado === "limite") {
    return respostaErro(429, "Muitas tentativas em pouco tempo — aguarde alguns minutos e tente de novo.");
  }
  if (login.resultado === "email_nao_confirmado") {
    return respostaErro(401, "Este e-mail ainda não foi confirmado. Confirme pelo link enviado antes de entrar.");
  }
  if (login.resultado === "conexao") {
    return respostaErro(502, "Não foi possível falar com o servidor de login agora. Tente de novo em instantes.");
  }
  if (login.resultado === "credenciais") {
    return respostaErro(401, "E-mail ou senha incorretos.");
  }

  // Login OK — agora a pergunta que importa: é admin?
  // (Não é admin / não deu para confirmar → sessão revogada, zero cookies.)
  const sessao = login.sessao;
  const admin = await verificarAdminPainel(sessao.access_token);

  if (admin === "falha") {
    await encerrarSessaoSupabase(sessao.access_token);
    return respostaErro(502, "Não foi possível confirmar o acesso de administradora agora. Tente de novo em instantes.");
  }
  if (admin !== "admin") {
    await encerrarSessaoSupabase(sessao.access_token);
    return respostaErro(403, "Esta conta não tem acesso de administradora.");
  }

  const resposta = NextResponse.json({ ok: true, email: sessao.user.email });
  aplicarCookiesSessao(resposta, sessao);
  return resposta;
}

// ------------------------------------------------------------
// DELETE — sair
// ------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(COOKIE_TOKEN)?.value ?? "";
  if (token) {
    await encerrarSessaoSupabase(token);
  }
  const resposta = NextResponse.json({ ok: true });
  limparCookiesSessao(resposta);
  return resposta;
}
