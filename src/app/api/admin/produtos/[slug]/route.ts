// ============================================================
// DONA SIL — API DO PAINEL — EDITAR PRODUTO
// ============================================================
// PATCH /api/admin/produtos/[slug] → grava os dados EDITÁVEIS
// da peça: nome, preço, categoria, descrição, composição,
// cuidados, status (ativo/rascunho) e destaque.
//
// Segurança (o MESMO padrão do cadastro — POST /api/admin/produtos):
//   * Sessão: o Bearer é o token do cookie httpOnly da sessão
//     (donasil-painel-token). Sem sessão válida → 401.
//   * É ADMIN? Quem decide é o POSTGRES: rpc existe_admin() com o
//     Bearer da sessão. Conta comum → 403.
//   * O UPDATE ainda passa pela política escrita_admin_produtos
//     (RLS) — esta rota não confia em si mesma: o banco é a
//     última linha. Sem SDK, sem SUPABASE_SECRET_KEY/service_role:
//     só as variáveis públicas + o Bearer da sessão.
//   * O alvo vem do PATH (nunca do corpo): a rota resolve o slug
//     no banco e grava por id — o cliente não escolhe o alvo.
//   * Corpo validado com Zod; a resposta do PostgREST é
//     revalidada com Zod ANTES de virar sucesso — sucesso sem
//     evidência não existe aqui.
//
// O que NÃO muda nesta rota: o slug (é a chave dos caminhos das
// fotos), demo, fotos legadas, cores, tamanhos e variações
// (estoque) — continuam somente leitura até a migração das
// variações (M2/M3). O UPDATE é de UMA linha, atômico: ou grava
// tudo ou não grava nada, sem estado intermediário.
//
// Erros: 401 sessão ausente/expirada · 403 conta sem admin ·
// 400 corpo inválido ou categoria inexistente · 404 peça não
// encontrada · 502 banco/rede/formato · 500 ambiente.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_TOKEN, verificarAdminPainel } from "@/lib/painel-auth";

// ------------------------------------------------------------
// Configuração (apenas variáveis públicas — nada de segredos)
// ------------------------------------------------------------

const TEMPO_LIMITE_MS = 10_000;

function configurar(): { url: string; chave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return null;
  return { url: url.replace(/\/+$/, ""), chave };
}

// ------------------------------------------------------------
// Erro do fluxo de edição (mensagem pronta para a usuária)
// ------------------------------------------------------------

class ErroEdicao extends Error {
  constructor(
    readonly status: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroEdicao";
  }
}

const MENSAGEM_SESSAO =
  "Sua sessão expirou — entre de novo no painel e repita o salvamento.";

function respostaErro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

// ------------------------------------------------------------
// Schemas Zod — corpo do pedido e respostas do PostgREST
// ------------------------------------------------------------

const corpoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  preco: z.number().positive().max(99999999.99),
  categoriaSlug: z.string().trim().min(1).max(60),
  descricao: z.string().trim().max(5000),
  composicao: z.string().trim().max(300),
  cuidados: z.string().trim().max(300),
  ativo: z.boolean(),
  destaque: z.boolean(),
});

/** Slug do PATH no formato canônico gerado pelo cadastro
 *  (gerarSlugBase: a-z, 0-9 e hífen). Recusa qualquer outra
 *  coisa ANTES de tocar o banco — nunca vira filtro PostgREST. */
const slugParamSchema = z.string().regex(/^[a-z0-9_-]{1,80}$/);

const produtoAtualSchema = z.array(z.object({
  id: z.uuid(),
  produto_cores: z.array(z.object({ produto_fotos: z.array(z.object({ caminho: z.string().min(1) })) })),
}));
const categoriaIdSchema = z.array(z.object({ id: z.uuid() }));
const produtoAtualizadoSchema = z.array(
  z.object({
    id: z.uuid(),
    nome: z.string().min(1),
    preco: z.number().nonnegative(),
    ativo: z.boolean(),
    destaque: z.boolean(),
  }),
);

/** Valida uma resposta do PostgREST — forma inesperada = erro honesto.
 *  Falha registra no SERVIDOR a etapa e o CAMINHO dos campos
 *  inválidos (nunca valores, tokens, cookies ou corpo completo). */
function validar<TSchema extends z.ZodType>(
  etapa: string,
  bruto: unknown,
  schema: TSchema,
): z.output<TSchema> {
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    console.error("[edicao] resposta fora do formato esperado", {
      etapa,
      campos: resultado.error.issues.map((issue) => issue.path.join(".")),
    });
    throw new ErroEdicao(
      502,
      "Os dados recebidos do catálogo vieram em um formato inesperado. Nada foi gravado — tente de novo.",
    );
  }
  return resultado.data;
}

// ------------------------------------------------------------
// Chamada base ao PostgREST (com o Bearer da sessão)
// ------------------------------------------------------------

type OpcoesChamada = {
  method: "GET" | "PATCH";
  params?: URLSearchParams;
  corpo?: unknown;
  /** Envia `Prefer: return=representation` — faz o UPDATE devolver
   *  a linha alterada: ela é a PROVA da gravação. O corpo da
   *  resposta é lido SEMPRE; a flag muda o que o banco devolve. */
  representacao?: boolean;
};

async function chamar(
  config: { url: string; chave: string },
  token: string,
  caminho: string,
  opcoes: OpcoesChamada,
): Promise<unknown | undefined> {
  const rota = `${config.url}/rest/v1/${caminho}${
    opcoes.params ? `?${opcoes.params.toString()}` : ""
  }`;

  const cabecalhos: Record<string, string> = {
    apikey: config.chave,
    Authorization: `Bearer ${token}`,
  };
  if (opcoes.corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  if (opcoes.representacao) cabecalhos["Prefer"] = "return=representation";

  let resposta: Response;
  try {
    resposta = await fetch(rota, {
      method: opcoes.method,
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
  } catch {
    throw new ErroEdicao(
      502,
      "Não foi possível falar com o servidor agora. Tente de novo em instantes.",
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroEdicao(401, MENSAGEM_SESSAO);
    }
    // Log de SERVIDOR: contexto sem corpos, sem tokens, sem dados da peça.
    console.error("[edicao] PostgREST recusou a chamada", {
      caminho,
      status: resposta.status,
    });
    throw new ErroEdicao(
      502,
      "O servidor do catálogo respondeu com um erro. Tente de novo em instantes.",
    );
  }

  // Corpo da resposta: lido SEMPRE que existir (GET devolve a
  // lista; PATCH com representation devolve a linha alterada).
  // Sem corpo → undefined; corpo que não é JSON válido → erro
  // honesto, sem vazar detalhes internos.
  const texto = await resposta.text();
  if (!texto) return undefined;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroEdicao(
      502,
      "Resposta inesperada do servidor do catálogo. Tente de novo.",
    );
  }
  return bruto;
}

// ------------------------------------------------------------
// PATCH — editar produto
// ------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/produtos/[slug]">,
) {
  // 0. O alvo vem do PATH — formato canônico ou 404 na hora,
  //    sem encostar no banco.
  const { slug } = await ctx.params;
  const slugParam = slugParamSchema.safeParse(slug);
  if (!slugParam.success) {
    return respostaErro(404, "Peça não encontrada.");
  }

  // 1. Sessão (cookie httpOnly) + confirmação de admin no BANCO.
  const token = request.cookies.get(COOKIE_TOKEN)?.value ?? "";
  if (!token) {
    return respostaErro(401, MENSAGEM_SESSAO);
  }
  const admin = await verificarAdminPainel(token);
  if (admin === "falha") {
    return respostaErro(
      502,
      "Não foi possível confirmar o acesso de administradora agora. Tente de novo em instantes.",
    );
  }
  if (admin !== "admin") {
    return respostaErro(403, "Esta conta não tem acesso de administradora.");
  }

  // 2. Corpo da edição.
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return respostaErro(
      400,
      "Não foi possível ler os dados do produto. Recarregue a página e tente de novo.",
    );
  }
  const corpo = corpoSchema.safeParse(bruto);
  if (!corpo.success) {
    return respostaErro(
      400,
      "Há campos incompletos ou inválidos — confira o formulário e tente de novo.",
    );
  }

  // 3. Ambiente.
  const config = configurar();
  if (!config) {
    return respostaErro(500, "O painel não está configurado neste ambiente.");
  }

  try {
    // 4. Resolver a peça pelo slug do PATH com o Bearer da sessão
    //    (a leitura administrativa enxerga ATIVAS e RASCUNHOS —
    //    as políticas escrita_admin_* valem para SELECT).
    const paramsProduto = new URLSearchParams({
      select: "id,produto_cores(produto_fotos(caminho))",
      slug: `eq.${slugParam.data}`,
      limit: "1",
    });
    const atual = validar(
      "produtos:consultar",
      await chamar(config, token, "produtos", {
        method: "GET",
        params: paramsProduto,
      }),
      produtoAtualSchema,
    );
    if (atual.length === 0) {
      return respostaErro(
        404,
        "Peça não encontrada — recarregue a lista de produtos.",
      );
    }
    const alvo = atual[0];
    if (corpo.data.ativo && (!corpo.data.descricao.trim() || !alvo.produto_cores.some(cor => cor.produto_fotos.length > 0))) {
      return respostaErro(400, "Adicione a descrição e pelo menos uma foto antes de ativar o anúncio. Salve como rascunho enquanto estiver preparando.");
    }

    // 5. A categoria precisa existir (o formulário lista as reais,
    //    mas a loja pode ter mudado desde que a página foi aberta).
    const paramsCategoria = new URLSearchParams({
      select: "id",
      slug: `eq.${corpo.data.categoriaSlug}`,
      limit: "1",
    });
    const categoria = validar(
      "categorias:consultar",
      await chamar(config, token, "categorias", {
        method: "GET",
        params: paramsCategoria,
      }),
      categoriaIdSchema,
    );
    if (categoria.length === 0) {
      return respostaErro(
        400,
        "A categoria escolhida não existe mais na loja. Recarregue a página e escolha outra.",
      );
    }

    // 6. UPDATE de UMA linha, por id — atômico. O corpo traz só os
    //    campos editáveis: slug, demo e fotos legadas ficam de
    //    fora. A RLS escrita_admin_produtos decide lá dentro
    //    (with check existe_admin) — sem atalho de autorização.
    const paramsUpdate = new URLSearchParams({
      id: `eq.${alvo.id}`,
      select: "id,nome,preco,ativo,destaque",
    });
    const resposta = await chamar(config, token, "produtos", {
      method: "PATCH",
      params: paramsUpdate,
      representacao: true,
      corpo: {
        nome: corpo.data.nome,
        descricao: corpo.data.descricao,
        composicao: corpo.data.composicao,
        cuidados: corpo.data.cuidados,
        preco: corpo.data.preco,
        categoria_id: categoria[0].id,
        ativo: corpo.data.ativo,
        destaque: corpo.data.destaque,
      },
    });

    // 7. Confirmação REAL: a linha devolvida pelo banco é a prova
    //    da gravação — exatamente UMA, com o id do alvo. Qualquer
    //    outra coisa = erro honesto, nunca sucesso falso.
    const atualizado = validar(
      "produtos:atualizar",
      resposta,
      produtoAtualizadoSchema,
    );
    if (atualizado.length !== 1 || atualizado[0].id !== alvo.id) {
      throw new ErroEdicao(
        502,
        "O banco não confirmou a gravação — recarregue a página e confira os dados antes de tentar de novo.",
      );
    }

    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof ErroEdicao) {
      return respostaErro(erro.status, erro.mensagem);
    }
    // Log de servidor: só o tipo do erro — sem corpos, sem tokens.
    console.error("[edicao] erro inesperado", {
      tipo: erro instanceof Error ? erro.name : "desconhecido",
    });
    return respostaErro(
      502,
      "Não foi possível salvar as alterações agora. Tente de novo em instantes.",
    );
  }
}
