// ============================================================
// DONA SIL — PAINEL — ENTRAR (LOGIN)
// ============================================================
// Tela de acesso do painel. O formulário conversa apenas com
// /api/admin/sessao (Route Handler): o servidor fala com o
// Supabase, confere com o banco se a conta é admin e só então
// grava os cookies httpOnly. Nada de token no localStorage.
//
// A URL (?proximo=…&motivo=…) é lida DENTRO de um Suspense —
// exigência do modo de cache do Next 16 para o casca estático
// (mesmo padrão das demais páginas do painel).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FormularioLogin from "@/components/admin/FormularioLogin";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/admin/login">;
type PropsConteudo = Pick<Props, "searchParams">;

/**
 * Só aceita destinos internos do próprio painel — evita redirecionar
 * para fora do site (?proximo= veio da URL e não é confiável).
 */
function destinoSeguro(proximo: string | null): string | null {
  if (!proximo) return null;
  if (!proximo.startsWith("/admin")) return null;
  if (proximo.startsWith("//")) return null;
  return proximo;
}

export default function PaginaLogin(props: Props) {
  return (
    <div className="flex min-h-[75dvh] items-center justify-center py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl font-semibold text-gold-ink">
            Dona Sil
          </p>
          <span className="mt-1 inline-block rounded-full bg-champagne px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-ink">
            Painel
          </span>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Entre com a sua conta de administradora.
          </p>
        </div>

        <div className="rounded-3xl border border-sand bg-ivory p-6 sm:p-8">
          <Suspense fallback={<EsqueletoFormulario />}>
            <ConteudoLogin searchParams={props.searchParams} />
          </Suspense>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-gold-ink transition hover:underline"
          >
            ← Voltar para a loja
          </Link>
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Leitura da URL (dentro do Suspense)
// ------------------------------------------------------------

async function ConteudoLogin({ searchParams }: PropsConteudo) {
  const params = await searchParams;
  const brutoProximo = params.proximo;
  const proximo =
    typeof brutoProximo === "string" ? destinoSeguro(brutoProximo) : null;
  const sessaoExpirada = params.motivo === "expirada";

  return (
    <FormularioLogin
      proximo={proximo ?? "/admin"}
      sessaoExpirada={sessaoExpirada}
    />
  );
}

// ------------------------------------------------------------
// Reserva do espaço do formulário enquanto a URL é lida
// ------------------------------------------------------------

function EsqueletoFormulario() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-5">
      <div className="h-11 rounded-xl bg-champagne" />
      <div className="h-11 rounded-xl bg-champagne" />
      <div className="h-11 rounded-full bg-champagne" />
    </div>
  );
}
