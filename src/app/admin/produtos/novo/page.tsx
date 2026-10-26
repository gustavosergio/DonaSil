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
import { io } from "next/cache";
import { Aviso } from "@/components/admin/Aviso";
import { FormularioProduto } from "@/components/admin/FormularioProduto";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { CatalogoErro, listarCategorias, listarOpcoesVariacoes } from "@/lib/catalogo";

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
  await io();
  // Categorias + cores/tamanhos reais das variações da loja
  // (nenhuma opção é inventada pelo painel).
  let categorias: Awaited<ReturnType<typeof listarCategorias>>;
  let opcoes: Awaited<ReturnType<typeof listarOpcoesVariacoes>>;
  try {
    [categorias, opcoes] = await Promise.all([
      listarCategorias(),
      listarOpcoesVariacoes(),
    ]);
  } catch (erro) {
    if (!(erro instanceof CatalogoErro)) throw erro;
    return (
      <Aviso tonalidade="atencao" titulo="Não foi possível preparar o cadastro">
        {erro.message} Recarregue a página depois de verificar a configuração
        ou a conexão do catálogo.
      </Aviso>
    );
  }
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
