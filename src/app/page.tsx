import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { produtosDemo } from "@/data/demo-produtos";
import { linkWhatsApp } from "@/lib/whatsapp";

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
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {produtosDemo.map((produto) => (
            <li key={produto.id}>
              <ProductCard produto={produto} />
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-ink-soft">
          Peças demonstrativas — nomes, preços e cores são exemplos até a
          publicação oficial.
        </p>
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
