// ============================================================
// DONA SIL — PAINEL — CADASTRAR PRODUTO (GRAVAÇÃO REAL)
// ============================================================
// Formulário completo, com as categorias reais no seletor e as
// sugestões de cores/tamanhos que já existem na loja. Ao salvar,
// o formulário envia o cadastro para POST /api/admin/produtos
// (Route Handler com sessão httpOnly): grava produto ATIVO +
// cores (produto_cores) + variações com estoque (variacoes).
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
          descricao="Preencha os dados da peça. Ao salvar, ela é criada no banco como ativa — fica visível na loja pública de imediato, com as cores e o estoque escolhidos."
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
