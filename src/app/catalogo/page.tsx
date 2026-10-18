import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import {
  CatalogoErro,
  listarCategorias,
  listarProdutos,
  type ProdutoResumo,
} from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Catálogo de moda feminina da Dona Sil — vestidos, blusas, saias, kimonos e acessórios, com filtro por categoria e busca.",
};

// ------------------------------------------------------------
// Filtros da URL (?categoria=slug&q=texto)
// ------------------------------------------------------------

type Filtros = { categoria: string | null; busca: string | null };

function primeiroValor(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function lerFiltros(searchParams: Record<string, string | string[] | undefined>): Filtros {
  return {
    categoria: primeiroValor(searchParams.categoria),
    busca: primeiroValor(searchParams.q),
  };
}

/** Monta o link do catálogo mantendo os filtros escolhidos. */
function montarHref(categoria: string | null, busca: string | null): Route<"/catalogo"> {
  const params = new URLSearchParams();
  if (categoria) params.set("categoria", categoria);
  if (busca) params.set("q", busca);
  const query = params.toString();
  return (`/catalogo${query ? `?${query}` : ""}`) as Route<"/catalogo">;
}

// ------------------------------------------------------------
// Página (casca estática + conteúdo dinâmico em Suspense)
// ------------------------------------------------------------

export default function PaginaCatalogo(props: PageProps<"/catalogo">) {
  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6"
    >
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-ink">
          Moda feminina
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
          Catálogo
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-soft">
          Explore as peças da coleção. Use os filtros por categoria ou a
          busca para encontrar o seu estilo.
        </p>
      </header>

      <Suspense fallback={<EsqueletoCatalogo />}>
        <ConteudoCatalogo searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

// ------------------------------------------------------------
// Conteúdo dinâmico: filtros + grade de produtos
// ------------------------------------------------------------

type PropsConteudo = Pick<PageProps<"/catalogo">, "searchParams">;

async function ConteudoCatalogo({ searchParams }: PropsConteudo) {
  const filtros = lerFiltros(await searchParams);

  let categorias: Awaited<ReturnType<typeof listarCategorias>>;
  let produtos: ProdutoResumo[];

  try {
    [categorias, produtos] = await Promise.all([
      listarCategorias(),
      listarProdutos({
        categoria: filtros.categoria ?? undefined,
        busca: filtros.busca ?? undefined,
      }),
    ]);
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  const temFiltroAtivo =
    (filtros.categoria !== null && filtros.busca !== null) ||
    filtros.categoria !== null ||
    filtros.busca !== null;

  return (
    <>
      {/* Filtros: categorias em links (funcionam sem JavaScript) */}
      <nav aria-label="Filtrar por categoria">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={montarHref(null, filtros.busca)}
              aria-current={filtros.categoria === null ? "page" : undefined}
              className={
                filtros.categoria === null
                  ? "rounded-full border border-gold bg-gold px-4 py-2 text-sm font-medium text-ink"
                  : "rounded-full border border-sand bg-ivory px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-gold-ink"
              }
            >
              Todas
            </Link>
          </li>
          {categorias.map((categoria) => (
            <li key={categoria.slug}>
              <Link
                href={montarHref(categoria.slug, filtros.busca)}
                aria-current={
                  filtros.categoria === categoria.slug ? "page" : undefined
                }
                className={
                  filtros.categoria === categoria.slug
                    ? "rounded-full border border-gold bg-gold px-4 py-2 text-sm font-medium text-ink"
                    : "rounded-full border border-sand bg-ivory px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-gold-ink"
                }
              >
                {categoria.nome}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Busca: formulário GET simples, mantém a categoria ativa */}
      <form
        action="/catalogo"
        method="get"
        role="search"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {filtros.categoria && (
          <input type="hidden" name="categoria" value={filtros.categoria} />
        )}
        <label htmlFor="busca-catalogo" className="sr-only">
          Buscar peças pelo nome ou descrição
        </label>
        <input
          id="busca-catalogo"
          type="search"
          name="q"
          defaultValue={filtros.busca ?? undefined}
          placeholder="Buscar peças…"
          className="w-full max-w-xs rounded-full border border-sand bg-ivory px-4 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus:border-gold focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-gold px-5 py-2 text-sm font-medium text-ink transition hover:bg-gold-deep"
        >
          Buscar
        </button>
        {temFiltroAtivo && (
          <Link
            href={montarHref(null, null)}
            className="text-sm font-medium text-gold-ink hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {/* Grade de produtos */}
      {produtos.length > 0 ? (
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {produtos.map((produto) => (
            <li key={produto.id}>
              <ProductCard produto={produto} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-3xl border border-sand bg-ivory px-6 py-14 text-center">
          <p className="font-display text-xl font-semibold text-ink">
            Nenhuma peça encontrada
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
            {temFiltroAtivo
              ? "Tente outro termo de busca ou veja todas as peças do catálogo."
              : "O catálogo ainda não tem peças cadastradas. Volte em breve!"}
          </p>
          {temFiltroAtivo && (
            <Link
              href={montarHref(null, null)}
              className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
            >
              Ver todas as peças
            </Link>
          )}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Estados auxiliares
// ------------------------------------------------------------

function AvisoErro({ erro }: { erro: unknown }) {
  // Falha de consulta NUNCA é mostrada como "sem produtos".
  const mensagem =
    erro instanceof CatalogoErro
      ? erro.message
      : "Não foi possível carregar o catálogo agora.";
  return (
    <div
      role="alert"
      className="rounded-3xl border border-sand bg-ivory px-6 py-14 text-center"
    >
      <p className="font-display text-xl font-semibold text-ink">
        Catálogo indisponível no momento
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
        {mensagem} Recarregue a página em alguns instantes ou fale com a
        gente pelo WhatsApp.
      </p>
    </div>
  );
}

function EsqueletoCatalogo() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <ul className="flex flex-wrap gap-2">
        {["Todas", "Vestidos", "Blusas", "Saias"].map((nome) => (
          <li
            key={nome}
            className="h-9 w-24 rounded-full border border-sand bg-champagne"
          />
        ))}
      </ul>
      <div className="mt-4 h-9 w-full max-w-xs rounded-full border border-sand bg-champagne" />
      <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, indice) => (
          <li key={indice}>
            <div className="aspect-[3/4] rounded-2xl bg-champagne" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-16 rounded-full bg-champagne" />
              <div className="h-4 w-32 rounded-full bg-champagne" />
              <div className="h-3 w-20 rounded-full bg-champagne" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
