// ============================================================
// DONA SIL — API DO PAINEL — CADASTRAR PRODUTO
// ============================================================
// POST /api/admin/produtos → cria produto + cores + variações
//
// Segurança:
//   * Sessão: o Bearer é o token do cookie httpOnly da sessão
//     (donasil-painel-token). Sem sessão válida → 401.
//   * É ADMIN? Quem decide é o POSTGRES: rpc existe_admin() com o
//     Bearer da sessão — o MESMO padrão do login. Conta comum → 403.
//   * Cada INSERT/DELETE ainda passa pelas políticas escrita_admin_*
//     (RLS) — esta rota não confia em si mesma: o banco é a última
//     linha. Sem SDK, sem SUPABASE_SECRET_KEY/service_role: só as
//     variáveis públicas + o Bearer da sessão.
//   * Corpo validado com Zod; respostas do PostgREST revalidadas
//     com Zod antes de virar tipo. Erros viram mensagem em
//     português — nunca detalhes internos do banco.
//
// Ordem da gravação (imposta pelas chaves estrangeiras):
//   1. produtos       — criado como rascunho para completar as fotos;
//   2. produto_cores  — uma linha por cor (devolve os ids);
//   3. variacoes      — cada cor × cada tamanho, preenchendo cor_id
//                       (nova) E as colunas legadas cor/cor_hex,
//                       que continuam NOT NULL no banco.
// Falha nas etapas 2/3 → tenta APAGAR o produto recém-criado
// (ON DELETE CASCADE limpa cores/variações) para não deixar
// registro incompleto — e a resposta é honesta sobre o resultado.
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
// Erro do fluxo de cadastro (mensagem pronta para a usuária)
// ------------------------------------------------------------

class ErroCadastro extends Error {
  constructor(
    readonly status: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroCadastro";
  }
}

const MENSAGEM_SESSAO =
  "Sua sessão expirou — entre de novo no painel e repita o cadastro.";

function respostaErro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

// ------------------------------------------------------------
// Schemas Zod — corpo do pedido e respostas do PostgREST
// ------------------------------------------------------------

const corCorpoSchema = z.object({
  nome: z.string().trim().min(1).max(40),
  hex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
});

const tamanhoCorpoSchema = z.object({
  tamanho: z.string().trim().min(1).max(12),
  quantidade: z.number().int().min(0).max(9999),
});

const corpoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  preco: z.number().positive().max(99999999.99),
  categoriaSlug: z.string().trim().min(1).max(60),
  descricao: z.string().trim().max(5000),
  composicao: z.string().trim().max(300),
  cuidados: z.string().trim().max(300),
  destaque: z.boolean(),
  cores: z.array(corCorpoSchema).min(1).max(8),
  tamanhos: z.array(tamanhoCorpoSchema).min(1).max(12),
});

const categoriaIdSchema = z.array(z.object({ id: z.uuid() }));
const slugExistenteSchema = z.array(z.object({ slug: z.string() }));
const produtoInseridoSchema = z.array(
  z.object({ id: z.uuid(), slug: z.string() }),
);
const corInseridaSchema = z.array(
  z.object({ id: z.uuid(), nome: z.string().min(1) }),
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
    console.error("[cadastro] resposta fora do formato esperado", {
      etapa,
      campos: resultado.error.issues.map((issue) => issue.path.join(".")),
    });
    throw new ErroCadastro(
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
  method: "GET" | "POST" | "DELETE";
  params?: URLSearchParams;
  corpo?: unknown;
  /** Envia `Prefer: return=representation` — faz o INSERT devolver
   *  as linhas criadas (precisa dos ids). O corpo da resposta é
   *  lido SEMPRE; a flag muda apenas o que o banco devolve. */
  representacao?: boolean;
  /** Mensagem quando o banco recusar por duplicidade (409). */
  mensagemDuplicado?: string;
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
    throw new ErroCadastro(
      502,
      "Não foi possível falar com o servidor agora. Tente de novo em instantes.",
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroCadastro(401, MENSAGEM_SESSAO);
    }
    if (resposta.status === 409) {
      throw new ErroCadastro(
        409,
        opcoes.mensagemDuplicado ??
          "Já existe um registro igual — confira nome, cores e tamanhos.",
      );
    }
    // Log de SERVIDOR: contexto sem corpos, sem tokens, sem dados da peça.
    console.error("[cadastro] PostgREST recusou a chamada", {
      caminho,
      status: resposta.status,
    });
    throw new ErroCadastro(
      502,
      "O servidor do catálogo respondeu com um erro. Tente de novo em instantes.",
    );
  }

  // Corpo da resposta: lido SEMPRE que existir, independente do
  // método (GET devolve a lista; INSERT/DELETE podem vir sem corpo).
  // Sem corpo → undefined; corpo que não é JSON válido → erro
  // honesto, sem vazar detalhes internos.
  const texto = await resposta.text();
  if (!texto) return undefined;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroCadastro(
      502,
      "Resposta inesperada do servidor do catálogo. Tente de novo.",
    );
  }
  return bruto;
}

// ------------------------------------------------------------
// Slug do produto (do nome) + colisão
// ------------------------------------------------------------

function gerarSlugBase(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** Slug único: base, base-2 … base-5. Acabou os sufixos = 409. */
async function slugUnico(
  config: { url: string; chave: string },
  token: string,
  base: string,
): Promise<string> {
  for (let tentativa = 0; tentativa <= 4; tentativa += 1) {
    const slug = tentativa === 0 ? base : `${base}-${tentativa + 1}`;
    const params = new URLSearchParams({
      select: "slug",
      slug: `eq.${slug}`,
      limit: "1",
    });
    const linhas = validar(
      "produtos:consultar-slug",
      await chamar(config, token, "produtos", { method: "GET", params }),
      slugExistenteSchema,
    );
    if (linhas.length === 0) return slug;
  }
  throw new ErroCadastro(
    409,
    "Já existem várias peças com esse nome — escolha outro nome.",
  );
}

// ------------------------------------------------------------
// Compensação: remove o produto incompleto (cascade limpa o resto)
// ------------------------------------------------------------

async function removerProduto(
  config: { url: string; chave: string },
  token: string,
  id: string,
): Promise<boolean> {
  try {
    const params = new URLSearchParams({ id: `eq.${id}` });
    await chamar(config, token, "produtos", { method: "DELETE", params });
    return true;
  } catch (erro) {
    console.error("[cadastro] falha na limpeza do produto incompleto", {
      id,
      status: erro instanceof ErroCadastro ? erro.status : null,
    });
    return false;
  }
}

// ------------------------------------------------------------
// Gravação completa (produto → cores → variações)
// ------------------------------------------------------------

async function gravarProduto(
  config: { url: string; chave: string },
  token: string,
  corpo: z.output<typeof corpoSchema>,
): Promise<string> {
  // 1. A categoria precisa existir (o formulário lista as reais, mas
  //    a loja pode ter mudado desde que a página foi aberta).
  const paramsCategoria = new URLSearchParams({
    select: "id",
    slug: `eq.${corpo.categoriaSlug}`,
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
    throw new ErroCadastro(
      400,
      "A categoria escolhida não existe mais na loja. Recarregue a página e escolha outra.",
    );
  }

  // 2. Slug único derivado do nome.
  const base = gerarSlugBase(corpo.nome);
  if (!base) {
    throw new ErroCadastro(400, "Escolha um nome com letras ou números.");
  }
  const slug = await slugUnico(config, token, base);

  // 3+4. Produto → cores → variações, tudo sob COMPENSAÇÃO: qualquer
  //      falha depois de o banco aceitar o produto (inclusive na
  //      validação da própria resposta de criação) tenta apagá-lo na
  //      hora. O produto nasce ATIVO (rascunho depende do ajuste da
  //      política pública de leitura; sem isso, vazaria pela API).
  let idProdutoCriado: string | null = null;
  try {
    const respostaProduto = await chamar(config, token, "produtos", {
      method: "POST",
      representacao: true,
      mensagemDuplicado: "Já existe uma peça com esse nome — escolha outro nome.",
      corpo: [
        {
          slug,
          nome: corpo.nome,
          descricao: corpo.descricao,
          composicao: corpo.composicao,
          cuidados: corpo.cuidados,
          preco: corpo.preco,
          categoria_id: categoria[0].id,
          fotos: [],
          ativo: false,
          destaque: corpo.destaque,
          demo: false,
        },
      ],
    });

    // Id extraído de forma TOLERANTE, antes da validação estrita:
    // se a resposta completa vier fora do formato, ainda sabemos
    // qual produto limpar na compensação (apenas o uuid — nada mais).
    const idTolerante = z
      .array(z.object({ id: z.uuid() }))
      .safeParse(respostaProduto);
    if (idTolerante.success) {
      idProdutoCriado = idTolerante.data[0]?.id ?? null;
    }

    const produto = validar(
      "produtos:inserir",
      respostaProduto,
      produtoInseridoSchema,
    )[0];
    idProdutoCriado = produto.id;

    // A MESMA cor não pode repetir (unique (produto_id, nome) no
    // banco). Dedupe aqui ignora maiúsculas: "Preta" = "preta".
    const coresVistas = new Set<string>();
    const cores = corpo.cores.filter((cor) => {
      const chave = cor.nome.toLowerCase();
      if (coresVistas.has(chave)) return false;
      coresVistas.add(chave);
      return true;
    });
    if (cores.length === 0) {
      throw new ErroCadastro(
        400,
        "Escolha ao menos uma cor — cores repetidas contam como uma só.",
      );
    }

    // PostgREST devolve as linhas criadas (return=representation):
    // o id de cada cor é o que liga as variações a ela.
    const coresBrutas = validar(
      "produto_cores:inserir",
      await chamar(config, token, "produto_cores", {
        method: "POST",
        representacao: true,
        mensagemDuplicado: "Já existe uma cor com esse nome nesta peça.",
        corpo: cores.map((cor, indice) => ({
          produto_id: produto.id,
          nome: cor.nome,
          cor_hex: cor.hex.toLowerCase(),
          ordem: indice,
        })),
      }),
      corInseridaSchema,
    );
    const idDaCor = new Map(coresBrutas.map((cor) => [cor.nome, cor.id]));

    // Tamanhos: mesmo dedupe ("P" e "p" são o mesmo tamanho).
    const tamanhosVistos = new Set<string>();
    const tamanhos = corpo.tamanhos.filter((tamanho) => {
      const chave = tamanho.tamanho.toLowerCase();
      if (tamanhosVistos.has(chave)) return false;
      tamanhosVistos.add(chave);
      return true;
    });
    if (tamanhos.length === 0) {
      throw new ErroCadastro(400, "Escolha ao menos um tamanho.");
    }

    // Variações: cada cor × cada tamanho. cor_id (nova) aponta para
    // a cor DESTE produto (FK composta do banco garante) e as
    // colunas legadas cor/cor_hex recebem os mesmos valores.
    const variacoes: Array<{
      produto_id: string;
      tamanho: string;
      cor: string;
      cor_hex: string;
      quantidade: number;
      cor_id: string;
    }> = [];
    for (const cor of cores) {
      const corId = idDaCor.get(cor.nome);
      if (!corId) {
        throw new ErroCadastro(
          502,
          "O banco devolveu uma resposta inesperada ao gravar as cores. Nada foi gravado — tente de novo.",
        );
      }
      for (const tamanho of tamanhos) {
        variacoes.push({
          produto_id: produto.id,
          tamanho: tamanho.tamanho,
          cor: cor.nome,
          cor_hex: cor.hex.toLowerCase(),
          quantidade: tamanho.quantidade,
          cor_id: corId,
        });
      }
    }

    await chamar(config, token, "variacoes", {
      method: "POST",
      mensagemDuplicado: "Já existe uma variação igual para esta peça.",
      corpo: variacoes,
    });
  } catch (erro) {
    // Compensação: apagar o produto recém-criado (se chegou a ser
    // criado — o id tolerante cobre até falha de validação da
    // resposta). Sem id = nada foi criado = banco já está limpo.
    // Se a limpeza falhar, a mensagem diz com honestidade o que
    // pode ter sobrado.
    const limpou = idProdutoCriado
      ? await removerProduto(config, token, idProdutoCriado)
      : true;
    if (erro instanceof ErroCadastro) {
      throw new ErroCadastro(
        erro.status,
        limpou
          ? `${erro.mensagem} Nada foi gravado — tente de novo.`
          : `${erro.mensagem} A peça pode ter ficado incompleta no banco: recarregue a lista de produtos para conferir.`,
      );
    }
    throw erro;
  }

  // O slug foi calculado aqui — é o mesmo gravado no banco.
  return slug;
}

// ------------------------------------------------------------
// POST — cadastrar produto
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
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

  // 2. Corpo do cadastro.
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

  // 3. Gravação.
  const config = configurar();
  if (!config) {
    return respostaErro(500, "O painel não está configurado neste ambiente.");
  }

  try {
    const slug = await gravarProduto(config, token, corpo.data);
    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (erro) {
    if (erro instanceof ErroCadastro) {
      return respostaErro(erro.status, erro.mensagem);
    }
    // Log de servidor: só o tipo do erro — sem corpos, sem tokens.
    console.error("[cadastro] erro inesperado", {
      tipo: erro instanceof Error ? erro.name : "desconhecido",
    });
    return respostaErro(
      502,
      "Não foi possível salvar a peça agora. Tente de novo em instantes.",
    );
  }
}
