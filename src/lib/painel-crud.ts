// ============================================================
// DONA SIL — PAINEL — CONSULTAS ADMINISTRATIVAS (Somente leitura)
// ============================================================
// Consultas ao PostgREST com o token httpOnly da sessão da
// administradora (cookies criados pelo login — ver
// src/lib/painel-auth.ts). É o "olho administrativo" do painel:
//
//   * o catálogo público (src/lib/catalogo.ts) usa a chave
//     anônima e só vê peças ATIVAS;
//   * aqui o Bearer é o token da sessão — as políticas
//     escrita_admin_* (politicas-rls.sql:133-145) valem para
//     SELECT e NÃO dependem de ativo, então RASCUNHOS também
//     voltam para administradoras.
//
// Quem decide o que cada um vê é o POSTGRES (RLS +
// existe_admin()) — este arquivo não faz "filtro de confiança"
// no lado de cá.
//
// Segurança:
//   * Só roda no servidor (importa next/headers para ler o
//     cookie httpOnly): Server Components e Route Handlers.
//   * Sem SDK, sem SUPABASE_SECRET_KEY/service_role — apenas
//     as variáveis públicas + o Bearer da sessão.
//   * Toda resposta é validada com Zod antes de virar tipo.
//   * Erros NUNCA viram lista vazia: PainelErro com mensagem
//     pronta, e a página decide o que mostrar.
// ============================================================

import { cache } from "react";
import { cookies } from "next/headers";
import { z } from "zod";
import { COOKIE_TOKEN } from "@/lib/painel-auth";
import type { CorPainel } from "@/lib/fotos";
import { escolherCapa } from "@/lib/catalogo";
import type {
  CorPeca,
  ProdutoCompleto,
  ProdutoResumo,
  VariacaoEstoque,
} from "@/lib/catalogo";

// ------------------------------------------------------------
// Erros da camada administrativa
// ------------------------------------------------------------

export type PainelErroTipo =
  | "sessao" // sem cookie de sessão ou token recusado pelo banco
  | "configuracao" // variável de ambiente ausente
  | "rede" // rede indisponível, tempo esgotado, DNS
  | "http" // o Supabase respondeu com erro (4xx/5xx)
  | "dados"; // JSON inválido ou fora do schema esperado

const MENSAGENS: Record<PainelErroTipo, string> = {
  sessao:
    "Sua sessão de administradora não está ativa — entre de novo no painel.",
  configuracao: "O painel não está configurado neste ambiente.",
  rede: "Não foi possível falar com o servidor do catálogo agora.",
  http: "O servidor do catálogo respondeu com um erro.",
  dados: "Os dados recebidos do catálogo estão em um formato inesperado.",
};

export class PainelErro extends Error {
  readonly tipo: PainelErroTipo;

  constructor(tipo: PainelErroTipo, mensagem?: string) {
    super(mensagem ?? MENSAGENS[tipo]);
    this.name = "PainelErro";
    this.tipo = tipo;
  }
}

// ------------------------------------------------------------
// Schemas Zod — espelham o retorno real do PostgREST
// (mesma forma dos schemas privados de catalogo.ts, acrescentando
//  ativo/destaque/demo na LISTA, que o catálogo público não usa)
// ------------------------------------------------------------

const categoriaEmbutidaSchema = z.object({
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

// Forma mínima da galeria para a CAPA — espelho do schema
// privado de catalogo.ts (a MESMA regra de escolherCapa vale
// nos dois lados). A lista do painel preenche `capa` para o
// tipo continuar inteiro em todos os usos.
const corGaleriaSchema = z.object({
  ordem: z.number().int().nonnegative(),
  produto_fotos: z.array(
    z.object({
      caminho: z.string().min(1),
      ordem: z.number().int().nonnegative(),
    }),
  ),
});

// Cores da tabela produto_cores (migração M1) com a galeria de
// fotos POR COR embutida — é o que alimenta a seção "Fotos por
// cor" do painel. Peças antigas e de demonstração não têm
// linhas nesta tabela (o embed volta vazio, e o componente
// explica isso na tela).
const fotoSchema = z.object({
  id: z.uuid(),
  caminho: z.string().min(1),
  ordem: z.number().int().nonnegative(),
});

const corTabelaSchema = z.object({
  id: z.uuid(),
  nome: z.string().min(1),
  cor_hex: z.string().min(1),
  ordem: z.number().int().nonnegative(),
  produto_fotos: z.array(fotoSchema),
});

// Linha da LISTA do painel: resumo + status administrativo.
const produtoListaSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  nome: z.string().min(1),
  preco: z.number().nonnegative(),
  ativo: z.boolean(),
  destaque: z.boolean(),
  demo: z.boolean(),
  categorias: categoriaEmbutidaSchema,
  variacoes: z.array(variacaoSchema),
  produto_cores: z.array(corGaleriaSchema),
});

// Linha completa (detalhe no painel) — mesma forma do detalhe
// público, consultada aqui SEM o filtro ativo, acrescentando as
// cores da tabela nova com suas fotos (produto_cores → produto_fotos).
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
  produto_cores: z.array(corTabelaSchema),
});

type ProdutoListaLinha = z.infer<typeof produtoListaSchema>;
type ProdutoDetalheLinha = z.infer<typeof produtoDetalheSchema>;

// ------------------------------------------------------------
// Tipos usados pelas páginas do painel
// ------------------------------------------------------------

/** Peça vista pelo painel: resumo público + status administrativo. */
export type ProdutoResumoPainel = ProdutoResumo & {
  ativo: boolean;
  destaque: boolean;
  demo: boolean;
};

/** Detalhe da peça no painel: dados públicos + cores da tabela
 *  nova (produto_cores) com a galeria de fotos de cada cor. */
export type ProdutoDetalhePainel = ProdutoCompleto & {
  coresPainel: CorPainel[];
};

// ------------------------------------------------------------
// Consulta base ao PostgREST (com o Bearer da sessão)
// ------------------------------------------------------------

const TEMPO_LIMITE_MS = 10_000;

function exigirConfiguracaoPainel(): { url: string; chave: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    // Mensagem genérica: não expõe valores do ambiente.
    throw new PainelErro("configuracao");
  }
  return { url: url.replace(/\/+$/, ""), chave };
}

/** Token de acesso da sessão (cookie httpOnly — o navegador não lê). */
async function tokenDaSessao(): Promise<string> {
  const armazem = await cookies();
  const token = armazem.get(COOKIE_TOKEN)?.value ?? "";
  if (!token) {
    // Sem sessão: falha fechada — nunca "se finge" de lista vazia.
    throw new PainelErro("sessao");
  }
  return token;
}

async function consultarPainel<TSchema extends z.ZodType>(
  caminho: string,
  params: URLSearchParams,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const { url, chave } = exigirConfiguracaoPainel();
  const token = await tokenDaSessao();
  const rota = `${url}/rest/v1/${caminho}?${params.toString()}`;

  let resposta: Response;
  try {
    resposta = await fetch(rota, {
      headers: {
        apikey: chave,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // Sempre fresco: estoque e status vêm do banco a cada acesso.
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new PainelErro("rede");
  }

  // 401/403 = token inválido, expirado ou acesso recusado pelo
  // banco — falha fechada com mensagem única e honesta.
  if (resposta.status === 401 || resposta.status === 403) {
    throw new PainelErro("sessao");
  }
  if (!resposta.ok) {
    throw new PainelErro("http");
  }

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    throw new PainelErro("dados");
  }

  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    throw new PainelErro("dados");
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

function paraResumoPainel(linha: ProdutoListaLinha): ProdutoResumoPainel {
  return {
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    preco: linha.preco,
    categoriaNome: linha.categorias.nome,
    categoriaSlug: linha.categorias.slug,
    cores: extrairCores(linha.variacoes),
    // MESMA regra da vitrine (escolherCapa, em catalogo.ts) —
    // o tipo ProdutoResumo agora exige o campo em todos os usos.
    capa: escolherCapa(linha.produto_cores),
    disponivel: linha.variacoes.some((v) => v.quantidade > 0),
    ativo: linha.ativo,
    destaque: linha.destaque,
    demo: linha.demo,
  };
}

function paraCompletoPainel(linha: ProdutoDetalheLinha): ProdutoDetalhePainel {
  const variacoes: VariacaoEstoque[] = [...linha.variacoes]
    .sort(compararVariacoes)
    .map((v) => ({
      id: v.id,
      tamanho: v.tamanho,
      cor: v.cor,
      corHex: v.cor_hex,
      quantidade: v.quantidade,
    }));

  // Cores da tabela nova, na ordem definida no cadastro; as fotos
  // de cada cor vêm na ordem própria da galeria (o PostgREST não
  // ordena embeds — a ordenação é feita aqui, já validada).
  const coresPainel: CorPainel[] = [...linha.produto_cores]
    .sort((a, b) =>
      a.ordem !== b.ordem
        ? a.ordem - b.ordem
        : a.nome.localeCompare(b.nome, "pt-BR"),
    )
    .map((cor) => ({
      id: cor.id,
      nome: cor.nome,
      hex: cor.cor_hex,
      ordem: cor.ordem,
      fotos: [...cor.produto_fotos]
        .sort((a, b) => a.ordem - b.ordem)
        .map((foto) => ({
          id: foto.id,
          caminho: foto.caminho,
          ordem: foto.ordem,
        })),
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
    // MESMA regra da vitrine (escolherCapa, em catalogo.ts) —
    // obrigatória porque ProdutoCompleto ganhou o campo capa.
    // O painel ainda não usa a capa em tela; o campo viaja
    // preenchido para os dois lados nunca divergirem.
    capa: escolherCapa(linha.produto_cores),
    variacoes,
    disponivel: variacoes.some((v) => v.quantidade > 0),
    estoqueTotal: variacoes.reduce((total, v) => total + v.quantidade, 0),
    coresPainel,
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
    // são removidos: a busca nunca vira comando.
    .replace(/[*(),\\]/g, "")
    .slice(0, 100);
}

// ------------------------------------------------------------
// Consultas administrativas (somente leitura)
// ------------------------------------------------------------

const SELECT_LISTA =
  "id,slug,nome,preco,ativo,destaque,demo,categorias(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade),produto_cores(ordem,produto_fotos(caminho,ordem))";

// PostgREST v12: para FILTRAR pela categoria embutida
// (categorias.slug=eq.…) o embed precisa do hint `!inner` (mesmo
// comportamento confirmado no catálogo público).
const SELECT_LISTA_FILTRADA =
  "id,slug,nome,preco,ativo,destaque,demo,categorias!inner(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade),produto_cores(ordem,produto_fotos(caminho,ordem))";

const SELECT_DETALHE =
  "id,slug,nome,descricao,composicao,cuidados,preco,fotos,ativo,destaque,demo,categorias(nome,slug),variacoes(id,tamanho,cor,cor_hex,quantidade),produto_cores(id,nome,cor_hex,ordem,produto_fotos(id,caminho,ordem))";

/**
 * TODAS as peças do banco para a lista do painel — ATIVAS e
 * RASCUNHOS (a consulta não filtra `ativo`; quem libera a leitura
 * é a política escrita_admin_produtos, válida para admin).
 * Filtros opcionais: categoria (slug) e busca textual — os dois
 * combinam entre si.
 */
export async function listarProdutosPainel(
  filtros: { categoria?: string; busca?: string } = {},
): Promise<ProdutoResumoPainel[]> {
  const params = new URLSearchParams({
    select: filtros.categoria?.trim() ? SELECT_LISTA_FILTRADA : SELECT_LISTA,
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

  const linhas = await consultarPainel(
    "produtos",
    params,
    z.array(produtoListaSchema),
  );
  return linhas.map(paraResumoPainel);
}

/**
 * Peça pelo slug para a página de detalhe do PAINEL — sem filtro
 * de ativo: rascunho abre normalmente (a loja pública continua
 * mostrando só ativas, pela função obterProduto de catalogo.ts).
 * Retorna `null` quando o slug não existe; falhas lançam
 * PainelErro — nunca confundidas com peça inexistente.
 *
 * Envolta em React `cache`: consultas repetidas dentro da mesma
 * requisição executam uma vez só.
 */
export const obterProdutoPainel = cache(
  async (slug: string): Promise<ProdutoDetalhePainel | null> => {
    const params = new URLSearchParams({
      select: SELECT_DETALHE,
      slug: `eq.${slug}`,
      limit: "1",
    });
    const linhas = await consultarPainel(
      "produtos",
      params,
      z.array(produtoDetalheSchema),
    );
    if (linhas.length === 0) return null;
    return paraCompletoPainel(linhas[0]);
  },
);

// ------------------------------------------------------------
// Pedidos — leitura administrativa (somente leitura)
// ------------------------------------------------------------
// Quem libera é a política leitura_admin_pedidos (SELECT para
// authenticated, USING existe_admin — politicas-rls.sql:156-166).
// Não existe grant nem política de ESCRITA para pedidos: esta
// camada não tem como alterar pedido nenhum, mesmo sem querer.

/** Status previstos no banco (schema.sql: CHECK em pedidos.status).
 *  Fonte única — a página /admin/pedidos deriva os filtros daqui. */
export const STATUS_PEDIDO = [
  "pendente",
  "confirmada",
  "enviada",
  "entregue",
  "cancelada",
  "expirada",
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

// Linha da LISTA do painel de pedidos. O timestamptz chega como
// string ISO do PostgREST; a conversão para Date acontece no
// mapeamento (à prova de variações de formato).
const pedidoListaSchema = z.object({
  id: z.uuid(),
  codigo: z.string().min(1),
  criado_em: z.string().min(1),
  nome_cliente: z.string().min(1),
  total: z.number().nonnegative(),
  status: z.enum(STATUS_PEDIDO),
});

// Item congelado na hora da compra (itens_pedido — foto real de
// nome, tamanho, cor e preço; nada é relido do catálogo).
const itemPedidoSchema = z.object({
  id: z.uuid(),
  produto_nome: z.string().min(1),
  variacao_tamanho: z.string().min(1),
  variacao_cor: z.string().min(1),
  quantidade: z.number().int().positive(),
  preco_unitario: z.number().nonnegative(),
});

// Pedido completo com os itens embutidos pela FK
// itens_pedido.pedido_id → pedidos.id (relação conferida por
// sonda: PostgREST resolve o embed e o bloqueio é só de permissão).
const pedidoDetalheSchema = z.object({
  id: z.uuid(),
  codigo: z.string().min(1),
  criado_em: z.string().min(1),
  status: z.enum(STATUS_PEDIDO),
  nome_cliente: z.string().min(1),
  whatsapp: z.string().min(1),
  cep: z.string(),
  endereco: z.string(),
  complemento: z.string(),
  bairro: z.string(),
  cidade: z.string(),
  uf: z.string(),
  frete_nome: z.string().min(1),
  frete_valor: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),
  itens_pedido: z.array(itemPedidoSchema),
});

type PedidoListaLinha = z.infer<typeof pedidoListaSchema>;
type PedidoDetalheLinha = z.infer<typeof pedidoDetalheSchema>;

/** Pedido na lista do painel: número, data, cliente, valor, status. */
export type PedidoResumoPainel = {
  id: string;
  codigo: string;
  criadoEm: Date;
  nomeCliente: string;
  total: number;
  status: StatusPedido;
};

/** Item do pedido como exibido no painel. */
export type ItemPedidoPainel = {
  id: string;
  produtoNome: string;
  tamanho: string;
  cor: string;
  quantidade: number;
  precoUnitario: number;
};

/** Pedido completo para a página de detalhes do painel. */
export type PedidoDetalhePainel = PedidoResumoPainel & {
  whatsapp: string;
  cep: string;
  endereco: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  freteNome: string;
  freteValor: number;
  subtotal: number;
  itens: ItemPedidoPainel[];
};

function paraResumoPedido(
  linha: PedidoListaLinha | PedidoDetalheLinha,
): PedidoResumoPainel {
  return {
    id: linha.id,
    codigo: linha.codigo,
    criadoEm: new Date(linha.criado_em),
    nomeCliente: linha.nome_cliente,
    total: linha.total,
    status: linha.status,
  };
}

function paraDetalhePedido(linha: PedidoDetalheLinha): PedidoDetalhePainel {
  return {
    ...paraResumoPedido(linha),
    whatsapp: linha.whatsapp,
    cep: linha.cep,
    endereco: linha.endereco,
    complemento: linha.complemento,
    bairro: linha.bairro,
    cidade: linha.cidade,
    uf: linha.uf,
    freteNome: linha.frete_nome,
    freteValor: linha.frete_valor,
    subtotal: linha.subtotal,
    // O PostgREST não ordena embeds — a ordenação é aqui, depois
    // da validação (mesma prática de produto_fotos acima).
    itens: [...linha.itens_pedido]
      .sort((a, b) => a.produto_nome.localeCompare(b.produto_nome, "pt-BR"))
      .map((item) => ({
        id: item.id,
        produtoNome: item.produto_nome,
        tamanho: item.variacao_tamanho,
        cor: item.variacao_cor,
        quantidade: item.quantidade,
        precoUnitario: item.preco_unitario,
      })),
  };
}

const SELECT_PEDIDO_LISTA = "id,codigo,criado_em,nome_cliente,total,status";

const SELECT_PEDIDO_DETALHE =
  "id,codigo,criado_em,status,nome_cliente,whatsapp,cep,endereco,complemento,bairro,cidade,uf,frete_nome,frete_valor,subtotal,total,itens_pedido(id,produto_nome,variacao_tamanho,variacao_cor,quantidade,preco_unitario)";

/**
 * Pedidos do banco para a lista do painel — SOMENTE leitura, com
 * o token httpOnly da sessão. A filtragem por status roda no
 * banco (índice idx_pedidos_status) e só aceita os valores
 * previstos em STATUS_PEDIDO — qualquer outro valor cai em
 * "todos" (a URL é da cliente, nunca é filtro de confiança).
 * Erros lançam PainelErro — nunca viram lista vazia.
 */
export async function listarPedidosPainel(
  filtros: { status?: string } = {},
): Promise<PedidoResumoPainel[]> {
  const params = new URLSearchParams({
    select: SELECT_PEDIDO_LISTA,
    order: "criado_em.desc",
  });

  const status = filtros.status?.trim();
  if (status && (STATUS_PEDIDO as readonly string[]).includes(status)) {
    params.set("status", `eq.${status}`);
  }

  const linhas = await consultarPainel(
    "pedidos",
    params,
    z.array(pedidoListaSchema),
  );
  return linhas.map(paraResumoPedido);
}

/**
 * Pedido pelo id (uuid) para a página de DETALHE do painel, com
 * os itens congelados na compra embutidos. Retorna `null` quando
 * o id não é um uuid válido ou o pedido não existe; falhas lançam
 * PainelErro — nunca confundidas com pedido inexistente.
 *
 * Envolta em React `cache`: consultas repetidas dentro da mesma
 * requisição executam uma vez só.
 */
export const obterPedidoPainel = cache(
  async (id: string): Promise<PedidoDetalhePainel | null> => {
    // Id fora do formato: nem consulta o banco — 404 limpo.
    const uuid = z.uuid().safeParse(id);
    if (!uuid.success) return null;

    const params = new URLSearchParams({
      select: SELECT_PEDIDO_DETALHE,
      id: `eq.${id}`,
      limit: "1",
    });
    const linhas = await consultarPainel(
      "pedidos",
      params,
      z.array(pedidoDetalheSchema),
    );
    if (linhas.length === 0) return null;
    return paraDetalhePedido(linhas[0]);
  },
);
