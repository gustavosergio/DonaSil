import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { linkWhatsApp } from "@/lib/whatsapp";
import { MODO_DEMO } from "@/lib/site";
import {
  CatalogoErro,
  listarDestaques,
  type ProdutoResumo,
} from "@/lib/catalogo";

const MENSAGEM_ATENDIMENTO =
  "Olá! Vim pelo site da Dona Sil e gostaria de saber mais sobre as peças.";

const categorias = ["Vestidos", "Blusas", "Saias", "Acessórios"];

export default function Home() {
  return (
    <main id="conteudo">
      {/* Destaque principal */}
      <section className="bg-gradient-to-b from-champagne/70 via-cream to-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-ink">
              Moda feminina
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight text-ink sm:text-6xl">
              Dona Sil
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-ink-soft">
              Peças escolhidas com carinho para o seu dia a dia. Explore a
              coleção, escolha tamanho e cor, e finalize sua compra com a
              gente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition hover:bg-gold-deep"
              >
                Explorar o catálogo
              </Link>
              <a
                href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
              >
                Tirar dúvidas
              </a>
            </div>
          </div>

          {/* Reserva de espaço das fotos reais — decoração por enquanto */}
          <div
            aria-hidden="true"
            className="relative mx-auto hidden h-80 w-72 sm:block lg:h-96 lg:w-80"
          >
            <div className="absolute inset-0 rotate-3 rounded-3xl bg-gold-soft/40" />
            <div className="absolute inset-0 -rotate-2 overflow-hidden rounded-3xl bg-sand">
              <div className="flex h-full items-end p-4">
                <span className="rounded-full bg-white/85 px-3 py-1 text-xs text-ink-soft">
                  Fotos demonstrativas
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section aria-labelledby="categorias" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="categorias" className="sr-only">
          Categorias
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categorias.map((categoria) => (
            <li key={categoria}>
              <Link
                href="/catalogo"
                className="flex h-24 items-center justify-center rounded-2xl border border-sand bg-ivory text-sm font-medium text-ink transition hover:border-gold hover:text-gold-ink sm:h-28"
              >
                {categoria}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Novidades */}
      <section aria-labelledby="novidades" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <h2
            id="novidades"
            className="font-display text-2xl font-semibold text-ink sm:text-3xl"
          >
            Novidades
          </h2>
          <Link
            href="/catalogo"
            className="text-sm font-medium text-gold-ink hover:underline"
          >
            Ver tudo
          </Link>
        </div>
        <Suspense fallback={<EsqueletoNovidades />}>
          <Novidades />
        </Suspense>
        {MODO_DEMO && (
          <p className="mt-8 text-xs text-ink-soft">
            Peças demonstrativas — nomes, preços e cores são exemplos até a
            publicação oficial.
          </p>
        )}
      </section>

      {/* Chamada para o WhatsApp */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl bg-gold px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl font-display text-2xl font-semibold text-ink sm:text-3xl">
            Dúvidas sobre peças, tamanhos ou entregas?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/70">
            Fale com a gente pelo WhatsApp. Atendimento pessoal, do jeito que
            sempre foi na Dona Sil.
          </p>
          <a
            href={linkWhatsApp(MENSAGEM_ATENDIMENTO)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-ivory px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
          >
            Chamar no WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

// ------------------------------------------------------------
// Novidades — produtos marcados como destaque no banco real
// ------------------------------------------------------------

async function Novidades() {
  let produtos: ProdutoResumo[];
  try {
    produtos = await listarDestaques();
  } catch (erro) {
    return <AvisoNovidades erro={erro} />;
  }

  if (produtos.length === 0) {
    return (
      <p className="mt-8 text-sm text-ink-soft">
        Em breve as peças em destaque da coleção aparecem aqui.
      </p>
    );
  }

  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
      {produtos.map((produto) => (
        <li key={produto.id}>
          <ProductCard produto={produto} />
        </li>
      ))}
    </ul>
  );
}

function AvisoNovidades({ erro }: { erro: unknown }) {
  // Falha de consulta não vira "sem destaques".
  const mensagem =
    erro instanceof CatalogoErro
      ? erro.message
      : "Não foi possível carregar as novidades agora.";
  return (
    <p role="alert" className="mt-8 text-sm text-ink-soft">
      {mensagem} Veja o catálogo completo.
    </p>
  );
}

function EsqueletoNovidades() {
  return (
    <ul
      aria-hidden="true"
      className="mt-8 grid animate-pulse grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, indice) => (
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
  );
}
