import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { linkWhatsApp } from "@/lib/whatsapp";
import { MODO_DEMO } from "@/lib/site";
import {
  CatalogoErro,
  listarCategorias,
  listarDestaques,
  type ProdutoResumo,
} from "@/lib/catalogo";

const MENSAGEM_ATENDIMENTO =
  "Olá! Vim pelo site da Dona Sil e gostaria de saber mais sobre as peças.";

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
                className="rounded-full bg-gold px-6 py-3 text-sm font-medium text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
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

          <aside className="rounded-3xl border border-sand bg-ivory p-8 sm:p-10" aria-label="Como comprar">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-ink">Do seu jeito</p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-ink">Escolha com calma.<br />A gente cuida do resto.</h2>
            <ol className="mt-7 space-y-5 text-sm leading-7 text-ink-soft">
              <li><span className="font-semibold text-gold-ink">01.</span> Explore as peças e escolha seu tamanho e cor.</li>
              <li><span className="font-semibold text-gold-ink">02.</span> Monte sua sacola e confira a entrega ou retirada.</li>
              <li><span className="font-semibold text-gold-ink">03.</span> Envie pelo WhatsApp. Nosso atendimento confirma a disponibilidade, o pagamento e o prazo.</li>
            </ol>
          </aside>
        </div>
      </section>

      {/* Categorias */}
      <section aria-labelledby="categorias" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 id="categorias" className="sr-only">
          Categorias
        </h2>
        <Suspense fallback={null}>
          <CategoriasHome />
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-labelledby="chamada-desapego">
        <div className="flex flex-col justify-between gap-6 rounded-3xl bg-[#173d38] px-7 py-9 text-[#f4f5e9] sm:flex-row sm:items-center sm:px-10">
          <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b8d3b7]">Um novo capítulo para cada objeto</p><h2 id="chamada-desapego" className="mt-3 text-3xl font-semibold">Nosso cantinho de desapegos.</h2><p className="mt-3 max-w-lg text-sm leading-7 text-[#d3e3db]">Objetos de casa, decoração e utilidades em uma seleção separada da moda Dona Sil.</p></div>
          <Link href="/desapego" className="shrink-0 rounded-full bg-[#f2b989] px-6 py-3 text-center text-sm font-semibold text-[#243b32] transition hover:bg-[#f9cda8]">Conhecer o Desapego →</Link>
        </div>
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
          <h2 className="mx-auto max-w-2xl font-display text-2xl font-semibold text-ink sm:text-3xl dark:text-[#2b2420]">
            Dúvidas sobre peças, tamanhos ou entregas?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/70 dark:text-[#2b2420]/70">
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

async function CategoriasHome() {
  let categorias: Awaited<ReturnType<typeof listarCategorias>>;
  try {
    categorias = await listarCategorias();
  } catch {
    return <Link href="/catalogo" className="text-sm text-gold-ink underline">Ver todas as peças</Link>;
  }
  return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categorias.filter(categoria => categoria.slug !== "desapego").map((categoria) => (
          <li key={categoria.slug}>
            <Link href={`/catalogo?categoria=${encodeURIComponent(categoria.slug)}`}
              className="flex h-24 items-center justify-center rounded-2xl border border-sand bg-ivory text-sm font-medium text-ink transition hover:border-gold hover:text-gold-ink sm:h-28">
              {categoria.nome}
            </Link>
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
