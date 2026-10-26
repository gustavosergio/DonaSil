"use client";

// ============================================================
// DONA SIL — PAINEL — FORMULÁRIO DE ENTRADA
// ============================================================
// Manda e-mail e senha para /api/admin/sessao (mesma origem).
// O servidor conversa com o Supabase e devolve:
//   200 → sessão criada (cookies httpOnly) → navega para o
//         destino seguro;
//   401/403/429/5xx → mensagem pronta em português, exibida aqui.
// Nenhum token passa pelo JavaScript da página.
// ============================================================

import { useState, type FormEvent } from "react";
import { Aviso } from "./Aviso";
import { Botao } from "./Botao";
import { CampoTexto } from "./Campo";

export default function FormularioLogin({
  proximo,
  sessaoExpirada = false,
}: {
  /** Destino interno após entrar (validado pela página). */
  proximo: string;
  /** Veio do portão: sessão antiga venceu/foi revogada. */
  sessaoExpirada?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    setErro(null);

    if (!email.trim() || !senha) {
      setErro("Informe o e-mail e a senha.");
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha }),
      });

      if (resposta.ok) {
        // Os cookies da sessão já foram gravados na resposta. A
        // navegação abaixo pede a página ao servidor, o portão
        // (proxy) lê o cookie novo e entrega o painel já logado.
        // Nova navegação evita reutilizar redirecionamentos prefetched
        // antes de o cookie de autenticação ter sido criado.
        window.location.assign(proximo);
        return;
      }

      const dados = (await resposta.json().catch(() => null)) as {
        mensagem?: unknown;
      } | null;
      const mensagem =
        typeof dados?.mensagem === "string" && dados.mensagem
          ? dados.mensagem
          : "Não foi possível entrar agora. Tente de novo em instantes.";
      setErro(mensagem);
    } catch {
      setErro(
        "Não foi possível conectar ao servidor. Verifique a internet e tente de novo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-5">
      {sessaoExpirada && !erro && (
        <Aviso tonalidade="info" titulo="Sessão encerrada">
          Sua sessão expirou — entre de novo para continuar.
        </Aviso>
      )}

      {erro && (
        <div
          role="alert"
          className="rounded-xl border border-[#e7c8bc] bg-[#f9ece6] px-4 py-3 text-sm leading-6 text-[#a04b32]"
        >
          {erro}
        </div>
      )}

      <CampoTexto
        id="login-email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        placeholder="voce@exemplo.com"
      />

      <CampoTexto
        id="login-senha"
        rotulo="Senha"
        type="password"
        autoComplete="current-password"
        required
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        placeholder="Sua senha"
      />

      <Botao
        type="submit"
        variante="primario"
        className="w-full"
        disabled={enviando}
      >
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
