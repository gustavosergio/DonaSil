// ============================================================
// DONA SIL — PAINEL — VER / EDITAR UM PRODUTO
// ============================================================
// Mostra os dados REAIS da peça pela LEITURA ADMINISTRATIVA
// (token httpOnly da sessão — ver src/lib/painel-crud.ts):
// ATIVAS e RASCUNHOS abrem aqui; a loja pública continua
// mostrando só ativas. Inclui a tabela de estoque real por
// variação, o ENVIO/EXCLUSÃO de fotos por cor (etapa 3) e o
// formulário de edição com GRAVAÇÃO REAL dos dados editáveis
// (nome, preço, categoria, descrição, composição, cuidados,
// status e destaque — cores/tamanhos/estoque continuam somente
// leitura até a migração das variações).
// ============================================================

import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatarBRL } from "@/lib/format";
import {
  CatalogoErro,
  listarCategorias,
  listarOpcoesVariacoes,
} from "@/lib/catalogo";
import {
  PainelErro,
  obterProdutoPainel,
  type ProdutoDetalhePainel,
} from "@/lib/painel-crud";
import { Aviso } from "@/components/admin/Aviso";
import { BotaoLink } from "@/components/admin/Botao";
import { FormularioProduto } from "@/components/admin/FormularioProduto";
import { FotosProduto } from "@/components/admin/FotosProduto";
import { AjustarEstoque } from "@/components/admin/AjustarEstoque";
import { IconeOlho } from "@/components/admin/Icones";
import { RotuloStatus } from "@/components/admin/RotuloStatus";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";

export const metadata: Metadata = {
  title: "Editar produto",
};

export default function PaginaEditarProduto(props: PageProps<"/admin/produtos/[slug]">) {
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

      <Suspense fallback={<EsqueletoProduto />}>
        <ConteudoProduto params={props.params} />
      </Suspense>
    </>
  );
}

type PropsConteudo = Pick<PageProps<"/admin/produtos/[slug]">, "params">;

async function ConteudoProduto({ params }: PropsConteudo) {
  const { slug } = await params;

  // Peça real + categorias + cores/tamanhos existentes na loja.
  // A peça vem pela LEITURA ADMINISTRATIVA (rascunhos incluídos,
  // com as cores novas + fotos por cor embutidas); categorias e
  // opções continuam na leitura pública.
  let produto: ProdutoDetalhePainel | null;
  let categorias: Awaited<ReturnType<typeof listarCategorias>>;
  let opcoes: Awaited<ReturnType<typeof listarOpcoesVariacoes>>;
  try {
    [produto, categorias, opcoes] = await Promise.all([
      obterProdutoPainel(slug),
      listarCategorias(),
      listarOpcoesVariacoes(),
    ]);
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  // Peça inexistente = 404. Rascunho (inativa) ABRE normalmente:
  // a leitura administrativa não filtra por ativo.
  if (!produto) {
    notFound();
  }

  // Tamanhos distintos das variações reais da peça — é o que
  // aparece na seção "Tamanhos (somente leitura)" do formulário.
  // As cores reais vão direto do produto (leitura administrativa).
  const tamanhosAtuais = [
    ...new Set(produto.variacoes.map((variacao) => variacao.tamanho)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      <div className="mt-4">
        <TituloSecao
          titulo={produto.nome}
          descricao={`Peça carregada pelo acesso administrativo — ativa ou rascunho. Categoria: ${produto.categoriaNome}.`}
          acoes={
            <BotaoLink
              href={(produto.categoriaSlug === "desapego" ? `/desapego/${produto.slug}` : `/catalogo/${produto.slug}`) as Route}
              variante="secundario"
            >
              <IconeOlho className="h-4 w-4" />
              Ver na loja
            </BotaoLink>
          }
        />
      </div>

      {/* Resumo real da peça */}
      <section
        aria-labelledby="resumo-produto"
        className="rounded-2xl border border-sand bg-ivory p-6"
      >
        <h2 id="resumo-produto" className="font-display text-lg font-semibold text-ink">
          Como a peça está hoje
        </h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-ink-soft">Preço</dt>
            <dd className="mt-0.5 font-medium text-ink">{formatarBRL(produto.preco)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Estoque total</dt>
            <dd className="mt-0.5 font-medium text-ink">{produto.estoqueTotal} peças</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Situação</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {!produto.ativo && <RotuloStatus tonalidade="neutro">Rascunho</RotuloStatus>}
              {produto.disponivel ? (
                <RotuloStatus tonalidade="ativo">Em estoque</RotuloStatus>
              ) : (
                <RotuloStatus tonalidade="esgotado">Esgotado</RotuloStatus>
              )}
              {produto.destaque && <RotuloStatus tonalidade="pendente">Destaque</RotuloStatus>}
              {produto.demo && <RotuloStatus tonalidade="neutro">Demonstração</RotuloStatus>}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Cores</dt>
            <dd className="mt-1 flex gap-1.5">
              {produto.cores.map((cor) => (
                <span
                  key={cor.nome}
                  title={cor.nome}
                  className="h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: cor.hex }}
                />
              ))}
            </dd>
          </div>
        </dl>
      </section>

      {/* Estoque real por variação */}
      <section aria-labelledby="estoque-produto" className="mt-8">
        <h2 id="estoque-produto" className="mb-3 font-display text-lg font-semibold text-ink">
          Estoque por variação
        </h2>
        <Tabela>
          <thead>
            <tr>
              <Th>Tamanho</Th>
              <Th>Cor</Th>
              <Th className="w-16">Amostra</Th>
              <Th className="text-right">Quantidade</Th>
            </tr>
          </thead>
          <tbody>
            {produto.variacoes.map((variacao) => (
              <tr key={variacao.id}>
                <Td className="font-medium">{variacao.tamanho}</Td>
                <Td className="text-ink-soft">{variacao.cor}</Td>
                <Td>
                  <span
                    aria-hidden="true"
                    className="inline-block h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: variacao.corHex }}
                  />
                </Td>
                <Td className="text-right">
                  <AjustarEstoque key={`${variacao.id}-${variacao.quantidade}`} id={variacao.id}
                    quantidade={variacao.quantidade} rotulo={`${variacao.tamanho} — ${variacao.cor}`} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </section>

      {/* Fotos por cor (envio e exclusão reais — etapa 3) */}
      <section aria-labelledby="fotos-produto" className="mt-8">
        <h2 id="fotos-produto" className="mb-3 font-display text-lg font-semibold text-ink">
          Fotos por cor
        </h2>
        <FotosProduto cores={produto.coresPainel} />
      </section>

      {/* Formulário de edição (gravação real dos dados editáveis) */}
      <section aria-labelledby="edicao-produto" className="mt-10">
        <h2 id="edicao-produto" className="mb-4 font-display text-lg font-semibold text-ink">
          Editar dados
        </h2>
        <FormularioProduto
          modo="edicao"
          slug={produto.slug}
          categorias={categorias}
          coresDisponiveis={opcoes.cores}
          tamanhosDisponiveis={opcoes.tamanhos}
          valoresIniciais={{
            nome: produto.nome,
            preco: produto.preco.toFixed(2).replace(".", ","),
            categoriaSlug: produto.categoriaSlug,
            descricao: produto.descricao,
            composicao: produto.composicao,
            cuidados: produto.cuidados,
            status: produto.ativo ? "ativo" : "rascunho",
            destaque: produto.destaque,
          }}
          coresAtuais={produto.cores}
          tamanhosAtuais={tamanhosAtuais}
        />
      </section>
    </>
  );
}

// ------------------------------------------------------------
// Estados auxiliares
// ------------------------------------------------------------

function AvisoErro({ erro }: { erro: unknown }) {
  // Falha de consulta NUNCA vira "peça não encontrada".
  const mensagem =
    erro instanceof PainelErro || erro instanceof CatalogoErro
      ? erro.message
      : "Não foi possível carregar esta peça agora.";
  const semSessao = erro instanceof PainelErro && erro.tipo === "sessao";
  return (
    <Aviso tonalidade="atencao" titulo="Não foi possível carregar a peça">
      {mensagem}{" "}
      {semSessao ? (
        <Link href="/admin/login" className="font-medium text-gold-ink hover:underline">
          Entrar de novo
        </Link>
      ) : (
        "Recarregue a página em alguns instantes ou volte para a lista."
      )}
    </Aviso>
  );
}

function EsqueletoProduto() {
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="animate-pulse space-y-6">
        <div className="h-9 w-2/3 rounded-full bg-champagne" />
        <div className="h-36 rounded-2xl bg-champagne" />
        <div className="h-56 rounded-2xl bg-champagne" />
      </div>
    </div>
  );
}
