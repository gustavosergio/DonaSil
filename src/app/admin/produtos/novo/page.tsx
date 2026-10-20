// ============================================================
// DONA SIL — PAINEL — CADASTRAR PRODUTO (FORMULÁRIO VISUAL)
// ============================================================
// Formulário completo, com as categorias reais no seletor.
// Ao "salvar" o painel apenas confere os campos e avisa que a
// gravação chega com a integração (migrações M2/M3 + login).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioProduto } from "@/components/admin/FormularioProduto";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { listarCategorias, listarOpcoesVariacoes } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Cadastrar produto",
};

export default function PaginaNovoProduto() {
  return (
    <>
      <nav aria-label="Voltar para a lista de produtos">
        <Link
          href="/admin/produtos"
          className="text-sm font-medium text-gold-ink hover:underline"
        >
          ← Voltar para Produtos
        </Link>
      </nav>

      <div className="mt-4">
        <TituloSecao
          titulo="Cadastrar produto"
          descricao="Preencha os dados da peça. Nesta etapa o formulário é visual: ele confere os campos, e a gravação no banco chega com a integração do painel."
        />
      </div>

      <Suspense fallback={<EsqueletoFormulario />}>
        <FormularioComCategorias />
      </Suspense>
    </>
  );
}

async function FormularioComCategorias() {
  // Categorias + cores/tamanhos reais das variações da loja
  // (nenhuma opção é inventada pelo painel).
  const [categorias, opcoes] = await Promise.all([
    listarCategorias(),
    listarOpcoesVariacoes(),
  ]);
  return (
    <FormularioProduto
      modo="novo"
      categorias={categorias}
      coresDisponiveis={opcoes.cores}
      tamanhosDisponiveis={opcoes.tamanhos}
    />
  );
}

function EsqueletoFormulario() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-5">
      <div className="h-16 rounded-2xl bg-champagne" />
      <div className="h-11 w-full rounded-xl bg-champagne" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="h-11 rounded-xl bg-champagne" />
        <div className="h-11 rounded-xl bg-champagne" />
      </div>
      <div className="h-24 rounded-xl bg-champagne" />
    </div>
  );
}
