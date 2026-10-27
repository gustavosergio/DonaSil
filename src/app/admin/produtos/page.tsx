// ============================================================
// DONA SIL — PAINEL — LISTA DE PRODUTOS
// ============================================================
// Lista REAL das peças pela LEITURA ADMINISTRATIVA (token httpOnly
// da sessão — ver src/lib/painel-crud.ts): ATIVAS e RASCUNHOS,
// com busca por nome, filtro por categoria e filtro por situação
// do estoque — tudo pela URL, funciona sem JS.
//
// A loja pública continua mostrando só peças ativas. O CADASTRO
// de peças novas já grava (ver /admin/produtos/novo); a edição
// gravável chega em etapa futura.
// ============================================================

import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatarBRL } from "@/lib/format";
import {
  CatalogoErro,
  listarCategorias,
  type CategoriaResumo,
} from "@/lib/catalogo";
import {
  PainelErro,
  listarProdutosPainel,
  type ProdutoResumoPainel,
} from "@/lib/painel-crud";
import { Aviso } from "@/components/admin/Aviso";
import { BotaoLink } from "@/components/admin/Botao";
import { EstadoVazio } from "@/components/admin/EstadoVazio";
import { IconeLapis, IconeMais, IconeOlho } from "@/components/admin/Icones";
import { RotuloStatus } from "@/components/admin/RotuloStatus";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";

type FiltroSituacao = "todas" | "disponivel" | "esgotado";

type Filtros = { busca: string | null; categoria: string | null; situacao: FiltroSituacao; cadastro: "reais" | "rascunhos" };

function primeiroValor(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

function lerFiltros(searchParams: Record<string, string | string[] | undefined>): Filtros {
  const situacao = primeiroValor(searchParams.situacao);
  return {
    cadastro: primeiroValor(searchParams.cadastro) === "rascunhos" ? "rascunhos" : "reais",
    busca: primeiroValor(searchParams.q),
    categoria: primeiroValor(searchParams.categoria),
    situacao:
      situacao === "disponivel" || situacao === "esgotado" ? situacao : "todas",
  };
}

export default function PaginaProdutosPainel(props: PageProps<"/admin/produtos">) {
  return (
    <>
      <TituloSecao
        titulo="Produtos"
        descricao="Produtos reais da loja. Para continuar um cadastro ainda não publicado, selecione Rascunhos no filtro."
        acoes={
          <BotaoLink href="/admin/produtos/novo">
            <IconeMais className="h-4 w-4" />
            Cadastrar produto
          </BotaoLink>
        }
      />

      <Suspense fallback={<EsqueletoProdutos />}>
        <ConteudoProdutos searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

type PropsConteudo = Pick<PageProps<"/admin/produtos">, "searchParams">;

async function ConteudoProdutos({ searchParams }: PropsConteudo) {
  const filtros = lerFiltros(await searchParams);

  let categorias: CategoriaResumo[];
  let produtos: ProdutoResumoPainel[];
  try {
    [categorias, produtos] = await Promise.all([
      listarCategorias(),
      listarProdutosPainel({
        categoria: filtros.categoria ?? undefined,
        busca: filtros.busca ?? undefined,
      }),
    ]);
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  // A lista principal e seus totais mostram somente produtos reais ativos.
  // Rascunhos reais continuam acessíveis para concluir novos cadastros.
  produtos = produtos.filter((produto) => !produto.demo && (
    filtros.cadastro === "rascunhos" ? !produto.ativo : produto.ativo
  ));

  // Situação do estoque: filtro local sobre dados reais.
  if (filtros.situacao === "disponivel") {
    produtos = produtos.filter((produto) => produto.disponivel);
  } else if (filtros.situacao === "esgotado") {
    produtos = produtos.filter((produto) => !produto.disponivel);
  }

  const temFiltro =
    filtros.busca !== null || filtros.categoria !== null || filtros.situacao !== "todas" || filtros.cadastro !== "reais";

  // Contagem honesta por status (para o rodapé da lista).
  const ativas = produtos.filter((produto) => produto.ativo).length;
  const rascunhos = produtos.length - ativas;

  return (
    <>
      <FiltrosProdutos categorias={categorias} filtros={filtros} />

      {produtos.length > 0 ? (
        <Tabela>
          <thead>
            <tr>
              <Th>Produto</Th>
              <Th>Preço</Th>
              <Th>Categoria</Th>
              <Th>Status</Th>
              <Th>Situação</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.id}>
                <Td className="font-medium">
                  {produto.nome}
                  <span className="block text-xs text-ink-soft">/{produto.slug}</span>
                </Td>
                <Td>{formatarBRL(produto.preco)}</Td>
                <Td className="text-ink-soft">{produto.categoriaNome}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {produto.ativo ? (
                      <RotuloStatus tonalidade="ativo">Ativa</RotuloStatus>
                    ) : (
                      <RotuloStatus tonalidade="neutro">Rascunho</RotuloStatus>
                    )}
                    {produto.demo && (
                      <RotuloStatus tonalidade="pendente">Demonstração</RotuloStatus>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    {produto.disponivel ? (
                      <RotuloStatus tonalidade="ativo">Em estoque</RotuloStatus>
                    ) : (
                      <RotuloStatus tonalidade="esgotado">Esgotado</RotuloStatus>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <BotaoLink
                      href={(produto.categoriaSlug === "desapego" ? `/desapego/${produto.slug}` : `/catalogo/${produto.slug}`) as Route}
                      tamanho="compacto"
                      variante="suave"
                      aria-label={`Ver ${produto.nome} na loja`}
                    >
                      <IconeOlho className="h-3.5 w-3.5" />
                      Ver na loja
                    </BotaoLink>
                    <BotaoLink
                      href={`/admin/produtos/${produto.slug}` as Route<"/admin/produtos/[slug]">}
                      tamanho="compacto"
                      variante="secundario"
                      aria-label={`Editar ${produto.nome}`}
                    >
                      <IconeLapis className="h-3.5 w-3.5" />
                      Editar
                    </BotaoLink>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      ) : (
        <EstadoVazio
          titulo={temFiltro ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
          descricao={
            temFiltro
              ? "Tente outro termo de busca ou limpe os filtros para ver todas as peças."
              : "Quando a loja cadastrar peças no banco, elas aparecem aqui automaticamente."
          }
          acao={
            temFiltro ? (
              <BotaoLink href="/admin/produtos" variante="secundario">
                Limpar filtros
              </BotaoLink>
            ) : undefined
          }
        />
      )}

      <p className="mt-4 text-xs leading-6 text-ink-soft">
        {produtos.length} {produtos.length === 1 ? "peça real nesta lista" : "peças reais nesta lista"}:{" "}
        {ativas} {ativas === 1 ? "ativa" : "ativas"}
        {rascunhos > 0 &&
          ` e ${rascunhos} ${rascunhos === 1 ? "rascunho" : "rascunhos"}`}
        . Demonstrações não aparecem nesta lista. Rascunhos ficam no filtro separado e não aparecem na loja pública.
      </p>
    </>
  );
}

// ------------------------------------------------------------
// Filtros (formulário GET — funciona sem JavaScript)
// ------------------------------------------------------------

function FiltrosProdutos({
  categorias,
  filtros,
}: {
  categorias: CategoriaResumo[];
  filtros: Filtros;
}) {
  return (
    <form
      action="/admin/produtos"
      method="get"
      role="search"
      className="mb-6 flex flex-wrap items-end gap-3"
    >
      <div>
        <label htmlFor="filtro-cadastro" className="sr-only">Filtrar por cadastro</label>
        <select
          id="filtro-cadastro"
          name="cadastro"
          defaultValue={filtros.cadastro}
          className="rounded-xl border border-sand bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
        >
          <option value="reais">Produtos reais</option>
          <option value="rascunhos">Rascunhos</option>
        </select>
      </div>
      <div>
        <label htmlFor="filtro-busca" className="sr-only">
          Buscar por nome
        </label>
        <input
          id="filtro-busca"
          type="search"
          name="q"
          defaultValue={filtros.busca ?? undefined}
          placeholder="Buscar por nome…"
          className="w-56 rounded-xl border border-sand bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="filtro-categoria" className="sr-only">
          Filtrar por categoria
        </label>
        <select
          id="filtro-categoria"
          name="categoria"
          defaultValue={filtros.categoria ?? ""}
          className="rounded-xl border border-sand bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.slug} value={categoria.slug}>
              {categoria.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filtro-situacao" className="sr-only">
          Filtrar por situação do estoque
        </label>
        <select
          id="filtro-situacao"
          name="situacao"
          defaultValue={filtros.situacao}
          className="rounded-xl border border-sand bg-ivory px-3.5 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
        >
          <option value="todas">Qualquer situação</option>
          <option value="disponivel">Com estoque</option>
          <option value="esgotado">Esgotadas</option>
        </select>
      </div>
      <button
        type="submit"
        className="rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
      >
        Aplicar
      </button>
      <Link href="/admin/produtos" className="pb-2 text-sm font-medium text-gold-ink hover:underline">
        Limpar
      </Link>
    </form>
  );
}

// ------------------------------------------------------------
// Estados auxiliares
// ------------------------------------------------------------

function AvisoErro({ erro }: { erro: unknown }) {
  const mensagem =
    erro instanceof PainelErro || erro instanceof CatalogoErro
      ? erro.message
      : "Não foi possível carregar a lista de produtos agora.";
  const semSessao = erro instanceof PainelErro && erro.tipo === "sessao";
  return (
    <Aviso tonalidade="atencao" titulo="Lista indisponível no momento">
      {mensagem}{" "}
      {semSessao ? (
        <Link href="/admin/login" className="font-medium text-gold-ink hover:underline">
          Entrar de novo
        </Link>
      ) : (
        "Recarregue a página em alguns instantes."
      )}
    </Aviso>
  );
}

function EsqueletoProdutos() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-6 flex gap-3">
        <div className="h-11 w-56 rounded-xl bg-champagne" />
        <div className="h-11 w-44 rounded-xl bg-champagne" />
        <div className="h-11 w-44 rounded-xl bg-champagne" />
      </div>
      <div className="h-72 rounded-2xl bg-champagne" />
    </div>
  );
}
