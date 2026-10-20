// ============================================================
// DONA SIL — ETAPA 4a — CAMADA DE ACESSO AO CATÁLOGO (Somente leitura)
// ============================================================
// Consultas ao Supabase pelo `fetch` nativo (PostgREST), executadas
// SEMPRE no servidor (Server Components). Sem SDK, sem chave secreta.
//
// Segurança:
//   * Usa apenas as variáveis públicas NEXT_PUBLIC_SUPABASE_URL e
//     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (chave anônima).
//   * NUNCA utiliza a SUPABASE_SECRET_KEY.
//   * Só faz GET de leitura nas tabelas públicas do catálogo
//     (produtos, categorias, variacoes embutidas).
//   * Toda resposta é validada com Zod antes de virar tipo.
//   * Erros NUNCA viram lista vazia: falha sempre lança
//     CatalogoErro e a página decide o que mostrar.
// ============================================================

import { cache } from "react";
import { z } from "zod";

// ------------------------------------------------------------
// Erros da camada de dados
// ------------------------------------------------------------

export type CatalogoErroTipo =
  | "configuracao" // variável de ambiente ausente
  | "rede" // rede indisponível, tempo esgotado, DNS
  | "http" // o Supabase respondeu com erro (4xx/5xx)
  | "dados"; // JSON inválido ou fora do schema esperado

const MENSAGENS: Record<CatalogoErroTipo, string> = {
  configuracao: "O catálogo não está configurado neste ambiente.",
  rede: "Não foi possível falar com o servidor do catálogo agora.",
  http: "O servidor do catálogo respondeu com um erro.",
  dados: "Os dados recebidos do catálogo estão em um formato inesperado.",
};

export class CatalogoErro extends Error {
  readonly tipo: CatalogoErroTipo;

  constructor(tipo: CatalogoErroTipo, mensagem?: string) {
    super(mensagem ?? MENSAGENS[tipo]);
    this.name = "CatalogoErro";
    this.tipo = tipo;
  }
}

// ------------------------------------------------------------
// Schemas Zod — espelham EXATAMENTE o retorno real do PostgREST
// (formatos confirmados por consultas de leitura ao banco real)
// ------------------------------------------------------------

const categoriaEmbutidaSchema = z.object({
  // Produto tem uma categoria (relação muitos-para-um): objeto direto.
  nome: z.string().min(1),
  slug: z.string().min(1),
});

const categoriaSchema = z.object({
  nome: z.string().min(1),
  slug: z.string().min(1),
});

const variacaoSchema = z.object({
  id: z.uuid(),
  tamanho: z.string().min(1),
  cor: z.string().min(1),
  cor_hex: z.string().min(1),
  quantidade: z.number().int().nonnegative(),
});

// Linha de produto para listas (catálogo, destaques da home).
const produtoResumoSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  nome: z.string().min(1),
  preco: z.number().nonnegative(),
  categorias: categoriaEmbutidaSchema,
  variacoes: z.array(variacaoSchema),
});

// Linha de produto completa para a página de detalhes.
const produtoDetalheSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  nome: z.string().min(1),
  descricao: z.string(),
  composicao: z.string(),
  cuidados: z.string(),
  preco: z.number().nonnegative(),
  fotos: z.array(z.string()),
  ativo: z.boolean(),
  destaque: z.boolean(),
  demo: z.boolean(),
  categorias: categoriaEmbutidaSchema,
  variacoes: z.array(variacaoSchema),
});

type ProdutoResumoLinha = z.infer<typeof produtoResumoSchema>;
type ProdutoDetalheLinha = z.infer<typeof produtoDetalheSchema>;

// ------------------------------------------------------------
// Tipos usados pelos componentes (já derivados do banco)
// ------------------------------------------------------------

export type CategoriaResumo = {
  nome: string;
  slug: string;
};

export type CorPeca = {
  nome: string;
  hex: string;
};

export type VariacaoEstoque = {
  id: string;
  tamanho: string;
  cor: string;
  corHex: string;
  quantidade: number;
};

export type ProdutoResumo = {
  id: string;
  slug: string;
  nome: string;
  preco: number;
  categoriaNome: string;
  categoriaSlug: string;
  cores: CorPeca[];
  // Disponível = existe PELO MENOS UMA variação com estoque (> 0).
  // Produto sem variações ou com todo o estoque zerado = esgotado.
  disponivel: boolean;
};

export type ProdutoCompleto = {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  composicao: string;
  cuidados: string;
  preco: number;
  fotos: string[];
  ativo: boolean;
  destaque: boolean;
  demo: boolean;
  categoriaNome: string;
  categoriaSlug: string;
  cores: CorPeca[];
  variacoes: VariacaoEstoque[];
  disponivel: boolean;
  estoqueTotal: number;
};

// ------------------------------------------------------------
// Consulta base ao PostgREST
// ------------------------------------------------------------

const TEMPO_LIMITE_MS = 10_000;

function exigirConfiguracao(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    // Mensagem genérica: não expõe nomes de variáveis além do
    // necessário nem nenhum valor do ambiente.
    throw new CatalogoErro("configuracao");
  }
  return { url: url.replace(/\/+$/, ""), chave };
}

async function consultar<TSchema extends z.ZodType>(
  caminho: string,
  params: URLSearchParams,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const { url, chave } = exigirConfiguracao();
  const rota = `${url}/rest/v1/${caminho}?${params.toString()}`;

  let resposta: Response;
  try {
    resposta = await fetch(rota, {
      headers: {
        apikey: chave,
        Authorization: `Bearer ${chave}`,
        Accept: "application/json",
      },
      // Sempre fresco: preços e estoque vêm do banco a cada visita.
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new CatalogoErro("rede");
  }

  if (!resposta.ok) {
    throw new CatalogoErro("http");
  }

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    throw new CatalogoErro("dados");
  }

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    throw new CatalogoErro("dados");
  }
  return resultado.data;
}

// ------------------------------------------------------------
// Conversões linha -> tipo da aplicação
// ------------------------------------------------------------

function compararVariacoes(
  a: { tamanho: string; cor: string },
  b: { tamanho: string; cor: string },
): number {
  if (a.tamanho !== b.tamanho) return a.tamanho.localeCompare(b.tamanho, "pt-BR");
  return a.cor.localeCompare(b.cor, "pt-BR");
}

function extrairCores(
  variacoes: Array<{ cor: string; cor_hex: string }>,
): CorPeca[] {
  const cores: CorPeca[] = [];
  const vistas = new Set<string>();
  for (const variacao of variacoes) {
    if (vistas.has(variacao.cor)) continue;
    vistas.add(variacao.cor);
    cores.push({ nome: variacao.cor, hex: variacao.cor_hex });
  }
  return cores;
}

function paraResumo(linha: ProdutoResumoLinha): ProdutoResumo {
  return {
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    preco: linha.preco,
    categoriaNome: linha.categorias.nome,
    categoriaSlug: linha.categorias.slug,
    cores: extrairCores(linha.variacoes),
    disponivel: linha.variacoes.some((v) => v.quantidade > 0),
  };
}

function paraCompleto(linha: ProdutoDetalheLinha): ProdutoCompleto {
  const variacoes: VariacaoEstoque[] = [...linha.variacoes]
    .sort(compararVariacoes)
    .map((v) => ({
      id: v.id,
      tamanho: v.tamanho,
      cor: v.cor,
      corHex: v.cor_hex,
      quantidade: v.quantidade,
    }));
  return {
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    descricao: linha.descricao,
    composicao: linha.composicao,
    cuidados: linha.cuidados,
    preco: linha.preco,
    fotos: linha.fotos,
    ativo: linha.ativo,
    destaque: linha.destaque,
    demo: linha.demo,
    categoriaNome: linha.categorias.nome,
    categoriaSlug: linha.categorias.slug,
    cores: extrairCores(linha.variacoes),
    variacoes,
    disponivel: variacoes.some((v) => v.quantidade > 0),
    estoqueTotal: variacoes.reduce((total, v) => total + v.quantidade, 0),
  };
}

// ------------------------------------------------------------
// Busca textual: limpeza antes de montar o filtro do PostgREST
// ------------------------------------------------------------

function sanitizarBusca(busca: string): string {
  return busca
    .trim()
    .replace(/\s+/g, " ")
    // Caracteres que são sintaxe do PostgREST em filtros `or`/`ilike`
    // são removidos: a busca do visitante nunca vira comando.
    .replace(/[*(),\\]/g, "")
    .slice(0, 100);
}

// ------------------------------------------------------------
// Consultas públicas (somente leitura)
// ------------------------------------------------------------

const SELECT_RESUMO =
  "id,slug,nome,preco,categorias(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade)";

// PostgREST v12: para FILTRAR os produtos pela categoria embutida
// (categorias.slug=eq.…), o embed precisa do hint `!inner` — sem ele
// o filtro é ignorado e o embed volta nulo (confirmado em testes de
// leitura contra o banco real; o schema Zod rejeitou essa resposta).
const SELECT_RESUMO_FILTRADO =
  "id,slug,nome,preco,categorias!inner(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade)";

const SELECT_DETALHE =
  "id,slug,nome,descricao,composicao,cuidados,preco,fotos,ativo,destaque,demo,categorias(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade)";

/** Categorias na ordem definida no banco (coluna `ordem`). */
export async function listarCategorias(): Promise<CategoriaResumo[]> {
  const params = new URLSearchParams({
    select: "nome,slug",
    order: "ordem.asc,nome.asc",
  });
  const linhas = await consultar("categorias", params, z.array(categoriaSchema));
  return linhas.map((c) => ({ nome: c.nome, slug: c.slug }));
}

/**
 * Produtos ativos, com filtro opcional de categoria (slug) e busca
 * textual (nome + descrição). Os dois filtros combinam entre si.
 */
export async function listarProdutos(
  filtros: { categoria?: string; busca?: string } = {},
): Promise<ProdutoResumo[]> {
  const params = new URLSearchParams({
    select: filtros.categoria?.trim() ? SELECT_RESUMO_FILTRADO : SELECT_RESUMO,
    ativo: "eq.true",
    order: "nome.asc",
  });

  const categoria = filtros.categoria?.trim();
  if (categoria) {
    params.set("categorias.slug", `eq.${categoria}`);
  }

  const busca = filtros.busca ? sanitizarBusca(filtros.busca) : "";
  if (busca) {
    params.set("or", `(nome.ilike.*${busca}*,descricao.ilike.*${busca}*)`);
  }

  const linhas = await consultar(
    "produtos",
    params,
    z.array(produtoResumoSchema),
  );
  return linhas.map(paraResumo);
}

/**
 * Produtos marcados como destaque (coluna `destaque = true`) para a
 * seção de novidades da página inicial. Limite de 8 peças — a grade
 * inicial tem 4 colunas; se a loja cadastrar mais destaques, os
 * excedentes entram na grade em novas linhas.
 */
export async function listarDestaques(): Promise<ProdutoResumo[]> {
  const params = new URLSearchParams({
    select: SELECT_RESUMO,
    ativo: "eq.true",
    destaque: "eq.true",
    order: "nome.asc",
    limit: "8",
  });
  const linhas = await consultar(
    "produtos",
    params,
    z.array(produtoResumoSchema),
  );
  return linhas.map(paraResumo);
}

/**
 * Produto ativo pelo slug, com todas as variações.
 * Retorna `null` quando o slug não existe (caso legítimo de
 * "produto não encontrado"). Falha de rede/servido/validação lança
 * CatalogoErro — nunca confundida com produto inexistente.
 *
 * Envolta em React `cache`: a página e o generateMetadata chamam a
 * mesma consulta dentro de uma mesma requisição e ela executa uma
 * vez só.
 */
export const obterProduto = cache(async (slug: string): Promise<ProdutoCompleto | null> => {
  const params = new URLSearchParams({
    select: SELECT_DETALHE,
    ativo: "eq.true",
    slug: `eq.${slug}`,
    limit: "1",
  });
  const linhas = await consultar(
    "produtos",
    params,
    z.array(produtoDetalheSchema),
  );
  if (linhas.length === 0) return null;
  return paraCompleto(linhas[0]);
});

// ------------------------------------------------------------
// Cores e tamanhos existentes nas variações reais da loja
// (fonte dos seletores do painel — nada é inventado aqui)
// ------------------------------------------------------------

export type OpcoesVariacao = {
  cores: CorPeca[];
  tamanhos: string[];
};

const variacaoOpcaoSchema = z.object({
  cor: z.string().min(1),
  cor_hex: z.string().min(1),
  tamanho: z.string().min(1),
});

/** Ordem de exibição dos tamanhos comuns; valores fora dela
 *  entram depois, em ordem alfabética (só apresentação). */
const ORDEM_TAMANHOS = ["PP", "P", "M", "G", "GG", "XG", "XGG", "Único"];

function ordenarTamanhos(a: string, b: string): number {
  const ia = ORDEM_TAMANHOS.indexOf(a);
  const ib = ORDEM_TAMANHOS.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b, "pt-BR");
}

/**
 * Cores e tamanhos que existem hoje nas variações reais do
 * catálogo (leitura pública, a mesma fonte da loja). O painel usa
 * esta lista nos seletores de cadastro/edição: o painel só oferece
 * opções que já existem no banco — nenhuma é criada aqui.
 */
export async function listarOpcoesVariacoes(): Promise<OpcoesVariacao> {
  const params = new URLSearchParams({
    select: "cor,cor_hex,tamanho",
    order: "cor.asc,tamanho.asc",
  });
  const linhas = await consultar(
    "variacoes",
    params,
    z.array(variacaoOpcaoSchema),
  );

  const cores: CorPeca[] = [];
  const vistas = new Set<string>();
  const tamanhos = new Set<string>();
  for (const linha of linhas) {
    if (!vistas.has(linha.cor)) {
      vistas.add(linha.cor);
      cores.push({ nome: linha.cor, hex: linha.cor_hex });
    }
    tamanhos.add(linha.tamanho);
  }

  cores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    cores,
    tamanhos: [...tamanhos].sort(ordenarTamanhos),
  };
}
