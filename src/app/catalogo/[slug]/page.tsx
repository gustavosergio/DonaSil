import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatarBRL } from "@/lib/format";
import { CatalogoErro, obterProduto, type ProdutoCompleto } from "@/lib/catalogo";
import AdicionarASacola from "@/components/AdicionarASacola";
import GaleriaPeca from "@/components/GaleriaPeca";
import { MODO_DEMO } from "@/lib/site";

type Props = PageProps<"/catalogo/[slug]">;

// ------------------------------------------------------------
// Metadados dinâmicos (título/descrição da peça, para SEO)
// ------------------------------------------------------------

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const { slug } = await props.params;
    const produto = await obterProduto(slug);
    if (!produto) {
      return { title: "Peça não encontrada" };
    }
    return {
      title: produto.nome,
      description:
        produto.descricao ||
        `${produto.nome} — ${produto.categoriaNome} da Dona Sil.`,
    };
  } catch {
    // Falha na consulta não deve derrubar a página: metadados genéricos.
    return { title: "Peça" };
  }
}

// ------------------------------------------------------------
// Página (casca estática + detalhe em Suspense)
// ------------------------------------------------------------

export default function PaginaProduto(props: Props) {
  return (
    <main
      id="conteudo"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6"
    >
      <nav aria-label="Voltar ao catálogo">
        <Link
          href="/catalogo"
          className="text-sm font-medium text-gold-ink hover:underline"
        >
          ← Voltar ao catálogo
        </Link>
      </nav>

      <Suspense fallback={<EsqueletoProduto />}>
        <DetalheProduto params={props.params} />
      </Suspense>
    </main>
  );
}

// ------------------------------------------------------------
// Detalhe do produto (dados reais, validados por Zod)
// ------------------------------------------------------------

async function DetalheProduto({ params }: Pick<Props, "params">) {
  const { slug } = await params;

  let produto: ProdutoCompleto | null;
  try {
    produto = await obterProduto(slug);
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  // Produto inexistente ou inativo = 404 legítimo.
  // (Falha de consulta já saiu pelo catch acima — nunca vira 404.)
  if (!produto) {
    notFound();
  }

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
      {/* Capa real (primeira foto da primeira cor com fotos —
          regra em src/lib/catalogo.ts); sem foto segue o
          placeholder "Foto demonstrativa". */}
      {produto.galeria.length > 0 ? <GaleriaPeca key={produto.id} fotos={produto.galeria} nome={produto.nome} /> : <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-champagne">
        {produto.capa ? (
          /* <img> simples — bucket externo do Supabase; o
             next/image exigiria remotePatterns no next.config
             (fora do escopo). Foto principal da página: sem
             loading="lazy" (acima da dobra). */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={produto.capa}
            alt={`Foto da peça ${produto.nome}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-gold-soft/50 via-champagne to-sand" />
            <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-soft">
              {MODO_DEMO ? "Foto demonstrativa" : "Foto em breve"}
            </div>
          </>
        )}
      </div>}

      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold-ink">
          {produto.categoriaNome}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
          {produto.nome}
        </h1>
        <p className="mt-4 text-xl text-ink">
          {formatarBRL(produto.preco)}
        </p>

        {!produto.disponivel && (
          <p className="mt-4">
            <span className="rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-ivory">
              Esgotado
            </span>
          </p>
        )}

        {produto.descricao && (
          <p className="mt-5 leading-8 text-ink-soft">{produto.descricao}</p>
        )}

        {produto.cores.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">Cores</p>
            <ul className="mt-2 flex gap-2" aria-label="Cores da peça">
              {produto.cores.map((cor) => (
                <li
                  key={cor.nome}
                  title={cor.nome}
                  aria-label={`Cor ${cor.nome}`}
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: cor.hex }}
                />
              ))}
            </ul>
          </div>
        )}

        {produto.variacoes.length > 0 && (
          <div className="mt-7">
            {/* Ilha cliente: seleciona tamanho/cor (estoque real do
                banco) e adiciona à sacola do navegador. Variações
                esgotadas ficam visíveis, porém desabilitadas. */}
            <AdicionarASacola
              produto={{
                slug: produto.slug,
                nome: produto.nome,
                preco: produto.preco,
              }}
              variacoes={produto.variacoes}
            />
          </div>
        )}

        {(produto.composicao || produto.cuidados) && (
          <div className="mt-7 space-y-2 text-sm leading-7 text-ink-soft">
            {produto.composicao && (
              <p>
                <span className="font-semibold text-ink">Composição: </span>
                {produto.composicao}
              </p>
            )}
            {produto.cuidados && (
              <p>
                <span className="font-semibold text-ink">Cuidados: </span>
                {produto.cuidados}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Estados auxiliares
// ------------------------------------------------------------

function AvisoErro({ erro }: { erro: unknown }) {
  // Falha de consulta NUNCA vira "produto não encontrado".
  const mensagem =
    erro instanceof CatalogoErro
      ? erro.message
      : "Não foi possível carregar esta peça agora.";
  return (
    <div
      role="alert"
      className="mt-10 rounded-3xl border border-sand bg-ivory px-6 py-14 text-center"
    >
      <p className="font-display text-xl font-semibold text-ink">
        Não foi possível carregar esta peça
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
        {mensagem} Recarregue a página em alguns instantes ou volte ao
        catálogo.
      </p>
      <Link
        href="/catalogo"
        className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
      >
        Voltar ao catálogo
      </Link>
    </div>
  );
}

function EsqueletoProduto() {
  return (
    <div
      aria-hidden="true"
      className="mt-6 grid animate-pulse gap-10 lg:grid-cols-2"
    >
      <div className="aspect-[3/4] rounded-3xl bg-champagne" />
      <div className="space-y-4">
        <div className="h-3 w-24 rounded-full bg-champagne" />
        <div className="h-9 w-2/3 rounded-full bg-champagne" />
        <div className="h-5 w-28 rounded-full bg-champagne" />
        <div className="h-24 w-full rounded-2xl bg-champagne" />
        <div className="h-40 w-full rounded-2xl bg-champagne" />
      </div>
    </div>
  );
}
