// ============================================================
// DONA SIL — PAINEL — CATEGORIAS
// ============================================================
// Lista REAL das categorias do catálogo (nome, slug, nº de
// peças ativas) + formulário visual para criar/editar.
// Nada é gravado — a escrita chega com a integração do painel.
// ============================================================

import { Suspense } from "react";
import { PainelCategorias, type CategoriaComContagem } from "@/components/admin/PainelCategorias";
import { AvisoErroCarregando } from "@/components/admin/AvisoErroCarregando";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { listarCategorias, listarProdutos } from "@/lib/catalogo";

export default function PaginaCategorias() {
  return (
    <>
      <TituloSecao
        titulo="Categorias"
        descricao="Os grupos do catálogo, com quantas peças ativas há em cada um. As categorias vêm do banco; a edição fica pronta para a integração."
      />

      <Suspense fallback={<EsqueletoCategorias />}>
        <ConteudoCategorias />
      </Suspense>
    </>
  );
}

async function ConteudoCategorias() {
  let categoriasComContagem: CategoriaComContagem[];
  try {
    const [categorias, produtos] = await Promise.all([
      listarCategorias(),
      listarProdutos(),
    ]);

    // Contagem real de peças ativas por categoria.
    const contagem = new Map<string, number>();
    for (const produto of produtos) {
      contagem.set(
        produto.categoriaSlug,
        (contagem.get(produto.categoriaSlug) ?? 0) + 1,
      );
    }

    categoriasComContagem = categorias.map((categoria) => ({
      nome: categoria.nome,
      slug: categoria.slug,
      produtos: contagem.get(categoria.slug) ?? 0,
    }));
  } catch (erro) {
    return <AvisoErroCarregando oQue="as categorias" erro={erro} />;
  }

  return <PainelCategorias categorias={categoriasComContagem} />;
}

function EsqueletoCategorias() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-8">
      <div className="h-48 rounded-2xl bg-champagne" />
      <div className="h-72 rounded-2xl bg-champagne" />
    </div>
  );
}
