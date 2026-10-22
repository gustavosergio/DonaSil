import type { Metadata } from "next";
import { Suspense } from "react";
import NavPainel from "@/components/admin/NavPainel";
import CascaPainel from "@/components/admin/CascaPainel";

// ============================================================
// DONA SIL — PAINEL ADMIN — LAYOUT
// ============================================================
// Envolve todas as rotas /admin com o menu lateral e a barra
// superior. O cabeçalho, o rodapé e o botão flutuante do site
// público ficam ocultos aqui (ver MostrarForaDoPainel no layout
// raiz).
//
// O menu (NavPainel) lê a rota atual no navegador e por isso
// fica dentro de um Suspense — exigência do modo de cache do
// Next 16 para o casca estático das páginas.
//
// A entrada de administradoras já está ativa (/admin/login +
// portão em src/proxy.ts — cookies httpOnly + Supabase Auth).
//
// Etapas futuras (já previstas no plano do painel):
//   * escrita no banco (após as migrações M2/M3);
//   * upload de fotos (Storage, na Etapa 10).
// ============================================================

export const metadata: Metadata = {
  title: "Painel",
  description: "Painel administrativo da loja Dona Sil (em preparação).",
  robots: { index: false, follow: false },
};

/** Reserva o espaço do menu enquanto a navegação carrega. */
function CascaNavegacao() {
  return (
    <>
      <aside
        aria-hidden="true"
        className="fixed inset-y-0 left-0 hidden w-64 border-r border-sand bg-ivory md:block"
      />
      <header
        aria-hidden="true"
        className="fixed inset-x-0 top-0 h-16 border-b border-sand bg-ivory/95 md:left-64"
      />
    </>
  );
}

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<CascaNavegacao />}>
        <NavPainel />
      </Suspense>
      {/* A casca lê a rota (client) para sumir na tela de entrada —
          por isso também precisa de um Suspense, como o menu acima
          (exigência do casca estático do Next 16). */}
      <Suspense fallback={<CascaConteudo />}>
        <CascaPainel>
          <main
            id="conteudo"
            className="mx-auto w-full max-w-5xl px-4 pb-16 pt-24 sm:px-6 lg:px-10"
          >
            {children}
          </main>
        </CascaPainel>
      </Suspense>
    </div>
  );
}

/** Reserva o espaço do conteúdo (com a margem do menu) enquanto a
 *  casca de cliente resolve a rota atual. */
function CascaConteudo() {
  return <div aria-hidden="true" className="min-h-dvh md:ml-64" />;
}
