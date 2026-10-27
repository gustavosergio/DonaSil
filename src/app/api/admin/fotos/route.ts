// ============================================================
// DONA SIL — API DO PAINEL — FOTOS POR COR
// ============================================================
// POST   /api/admin/fotos → envia a imagem ao bucket
//        fotos-produtos e registra a linha em produto_fotos.
// DELETE /api/admin/fotos → apaga o registro e o arquivo.
//
// Segurança (mesmo modelo da rota de produtos):
//   * Sessão: o Bearer é o token do cookie httpOnly
//     (donasil-painel-token). Sem sessão → 401.
//   * É ADMIN? Quem decide é o POSTGRES: rpc existe_admin() com o
//     Bearer da sessão. Falha de confirmação → 502 (falha
//     fechada); conta comum → 403.
//   * Cada operação ainda passa pelas políticas do banco:
//     escrita_admin_produto_fotos (tabela) e
//     escrita_admin_fotos / exclusao_admin_fotos (Storage),
//     todas com existe_admin() — sem SDK, sem service_role,
//     apenas as variáveis públicas + o Bearer da sessão.
//   * Conteúdo validado por BYTES (magic numbers em
//     src/lib/fotos.ts): JPEG, PNG ou WebP, até 5 MB. O MIME e
//     o nome declarados pelo navegador são IGNORADOS — um
//     ".jpg" que contém outra coisa é recusado (415).
//
// Caminho canônico (migracao-painel-1.sql, item 2):
//   fotos/<slug-do-produto>/<id-da-cor>/<uuid>.<extensao>
//   O slug vem do produto DA COR (consultado no servidor) e o
//   id da cor é validado — o pedido do cliente não escolhe
//   caminho nenhum.
//
// Falhas parciais:
//   * POST: arquivo aceito no Storage + registro recusado →
//     tenta apagar o arquivo (best-effort) e responde com
//     honestidade sobre o que pode ter sobrado;
//   * DELETE: Storage recusa → o REGISTRO FICA (foto intacta
//     no catálogo, nova tentativa possível) e a rota devolve
//     erro. Objeto já inexistente (404) é tolerado como
//     sucesso — registro apontando para arquivo que não existe
//     é pior que limpeza adiada.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_TOKEN, verificarAdminPainel } from "@/lib/painel-auth";
import { tomDaCor } from "@/lib/cores";
import {
  BUCKET_FOTOS,
  LIMITE_FOTO_BYTES,
  detectarFormatoFoto,
} from "@/lib/fotos";

// ------------------------------------------------------------
// Configuração (apenas variáveis públicas — nada de segredos)
// ------------------------------------------------------------

const TEMPO_LIMITE_MS = 10_000;
// 5 MB em conexão lenta precisa de fôlego maior que o comum.
const TEMPO_UPLOAD_MS = 30_000;

function configurar(): { url: string; chave: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return null;
  return { url: url.replace(/\/+$/, ""), chave };
}

// ------------------------------------------------------------
// Erro do fluxo de fotos (mensagem pronta para a usuária)
// ------------------------------------------------------------

class ErroFoto extends Error {
  constructor(
    readonly status: number,
    readonly mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroFoto";
  }
}

const MENSAGEM_SESSAO =
  "Sua sessão expirou — entre de novo no painel e tente de novo.";

function respostaErro(status: number, mensagem: string): NextResponse {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

// ------------------------------------------------------------
// Schemas Zod — corpo do pedido e respostas do PostgREST
// ------------------------------------------------------------

const idCorpoSchema = z.object({ id: z.uuid() });

// Cor consultada com o produto embutido: o SLUG do caminho vem
// daqui (produtos.slug), não do pedido.
const corComProdutoSchema = z.array(
  z.object({
    id: z.uuid(),
    produto_id: z.uuid(),
    nome: z.string(),
    cor_hex: z.string(),
    produtos: z.object({ slug: z.string().min(1) }),
  }),
);

const ordemSchema = z.array(
  z.object({ ordem: z.number().int().nonnegative() }),
);

const fotoInseridaSchema = z.array(
  z.object({ id: z.uuid(), caminho: z.string().min(1) }),
);

const fotoConsultadaSchema = z.array(
  z.object({ id: z.uuid(), caminho: z.string().min(1) }),
);

/** Valida uma resposta do PostgREST — forma inesperada = erro
 *  honesto. Falha registra no SERVIDOR a etapa e o CAMINHO dos
 *  campos inválidos (nunca valores, tokens, cookies ou corpo). */
function validar<TSchema extends z.ZodType>(
  etapa: string,
  bruto: unknown,
  schema: TSchema,
): z.output<TSchema> {
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    console.error("[fotos] resposta fora do formato esperado", {
      etapa,
      campos: resultado.error.issues.map((issue) => issue.path.join(".")),
    });
    throw new ErroFoto(
      502,
      "Os dados recebidos do catálogo vieram em um formato inesperado. Tente de novo.",
    );
  }
  return resultado.data;
}

// ------------------------------------------------------------
// Chamada base ao PostgREST (com o Bearer da sessão)
// ------------------------------------------------------------

type OpcoesChamada = {
  method: "GET" | "POST" | "DELETE" | "PATCH";
  params?: URLSearchParams;
  corpo?: unknown;
  /** `Prefer: return=representation` — o INSERT devolve as
   *  linhas criadas (precisa do id). O corpo da resposta é
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
    throw new ErroFoto(
      502,
      "Não foi possível falar com o servidor agora. Tente de novo em instantes.",
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroFoto(401, MENSAGEM_SESSAO);
    }
    if (resposta.status === 409) {
      throw new ErroFoto(
        409,
        opcoes.mensagemDuplicado ?? "Já existe um registro igual — tente de novo.",
      );
    }
    // Log de SERVIDOR: contexto sem corpos, tokens ou caminhos.
    console.error("[fotos] PostgREST recusou a chamada", {
      caminho,
      status: resposta.status,
    });
    throw new ErroFoto(
      502,
      "O servidor do catálogo respondeu com um erro. Tente de novo em instantes.",
    );
  }

  // Corpo lido SEMPRE que existir; sem corpo → undefined; JSON
  // inválido → erro honesto, sem vazar detalhes internos.
  const texto = await resposta.text();
  if (!texto) return undefined;
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroFoto(
      502,
      "Resposta inesperada do servidor do catálogo. Tente de novo.",
    );
  }
  return bruto;
}

// ------------------------------------------------------------
// Storage do Supabase (fetch nativo, sem SDK)
// ------------------------------------------------------------

/** Envia os bytes validados ao bucket com o Bearer da sessão
 *  (a política escrita_admin_fotos + existe_admin decide). */
async function enviarArquivo(
  config: { url: string; chave: string },
  token: string,
  caminho: string,
  conteudo: ArrayBuffer,
  mime: string,
): Promise<void> {
  let resposta: Response;
  try {
    resposta = await fetch(
      `${config.url}/storage/v1/object/${BUCKET_FOTOS}/${caminho}`,
      {
        method: "POST",
        headers: {
          apikey: config.chave,
          Authorization: `Bearer ${token}`,
          "Content-Type": mime,
        },
        body: conteudo,
        cache: "no-store",
        signal: AbortSignal.timeout(TEMPO_UPLOAD_MS),
      },
    );
  } catch {
    throw new ErroFoto(
      502,
      "Não foi possível falar com o armazenamento agora. Tente de novo em instantes.",
    );
  }

  if (!resposta.ok) {
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ErroFoto(401, MENSAGEM_SESSAO);
    }
    console.error("[fotos] storage recusou o upload", {
      status: resposta.status,
    });
    throw new ErroFoto(
      502,
      "Não foi possível enviar o arquivo para o armazenamento. A foto não foi gravada — tente de novo.",
    );
  }
}

/**
 * Apaga o objeto do bucket (política exclusao_admin_fotos).
 * Retorna true quando o objeto saiu OU já não existia (404 é
 * tolerado — limpeza de resto antigo não pode travar a exclusão
 * do registro). 401/403 viram erro de sessão; qualquer outra
 * recusa devolve false — o CHAMADOR decide se o registro fica.
 */
async function removerArquivo(
  config: { url: string; chave: string },
  token: string,
  caminho: string,
): Promise<boolean> {
  let resposta: Response;
  try {
    resposta = await fetch(
      `${config.url}/storage/v1/object/${BUCKET_FOTOS}/${caminho}`,
      {
        method: "DELETE",
        headers: {
          apikey: config.chave,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      },
    );
  } catch {
    // Rede fora: o arquivo NÃO foi removido.
    return false;
  }

  if (resposta.ok) return true;
  if (resposta.status === 404) return true;
  if (resposta.status === 401 || resposta.status === 403) {
    throw new ErroFoto(401, MENSAGEM_SESSAO);
  }
  console.error("[fotos] storage recusou a exclusão", {
    status: resposta.status,
  });
  return false;
}

// ------------------------------------------------------------
// Sessão + confirmação de admin (mesma ordem da rota produtos)
// ------------------------------------------------------------

/** Devolve o token da sessão ou lança ErroFoto (401/403/502). */
async function sessaoAdmin(request: NextRequest): Promise<string> {
  const token = request.cookies.get(COOKIE_TOKEN)?.value ?? "";
  if (!token) {
    throw new ErroFoto(401, MENSAGEM_SESSAO);
  }
  const admin = await verificarAdminPainel(token);
  if (admin === "falha") {
    throw new ErroFoto(
      502,
      "Não foi possível confirmar o acesso de administradora agora. Tente de novo em instantes.",
    );
  }
  if (admin !== "admin") {
    throw new ErroFoto(403, "Esta conta não tem acesso de administradora.");
  }
  return token;
}

// ------------------------------------------------------------
// POST — enviar uma foto (multipart: corId + arquivo)
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  let corAlterada = false;
  const config = configurar();
  if (!config) {
    return respostaErro(500, "O painel não está configurado neste ambiente.");
  }

  try {
    const token = await sessaoAdmin(request);

    // 1. Multipart: corId (uuid) + arquivo (File).
    let dados: FormData;
    try {
      dados = await request.formData();
    } catch {
      return respostaErro(
        400,
        "Não foi possível ler o arquivo enviado. Tente de novo.",
      );
    }

    const corIdBruto = dados.get("corId");
    const corId = typeof corIdBruto === "string" ? corIdBruto.trim() : "";
    if (!z.uuid().safeParse(corId).success) {
      return respostaErro(
        400,
        "Escolha uma cor da peça antes de enviar a foto.",
      );
    }

    const nomeInformado = dados.get("corNome");
    const nomeCor = nomeInformado === null ? null : z.string().trim().min(1).max(40).safeParse(nomeInformado);
    if (nomeCor && !nomeCor.success) return respostaErro(400, "Informe a cor da peça, com até 40 caracteres.");

    const arquivoBruto = dados.get("arquivo");
    if (!(arquivoBruto instanceof File)) {
      return respostaErro(400, "Envie um arquivo de imagem (JPEG, PNG ou WebP).");
    }
    if (arquivoBruto.size === 0) {
      return respostaErro(400, "O arquivo enviado está vazio.");
    }
    if (arquivoBruto.size > LIMITE_FOTO_BYTES) {
      return respostaErro(413, "A foto passa de 5 MB — escolha um arquivo menor.");
    }

    // 2. Formato PELOS BYTES: nome e MIME declarados não valem.
    const buffer = await arquivoBruto.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const formato = detectarFormatoFoto(bytes);
    if (!formato) {
      return respostaErro(
        415,
        "Formato não suportado — o conteúdo do arquivo não é JPEG, PNG ou WebP de verdade.",
      );
    }

    // 3. A cor precisa existir; o SLUG do caminho vem do produto
    //    DELA — o pedido não informa (nem precisa informar) a
    //    peça. Admin lê até rascunho pela política escrita_admin.
    const paramsCor = new URLSearchParams({
      select: "id,produto_id,nome,cor_hex,produtos(slug)",
      id: `eq.${corId}`,
      limit: "1",
    });
    const cores = validar(
      "produto_cores:consultar",
      await chamar(config, token, "produto_cores", {
        method: "GET",
        params: paramsCor,
      }),
      corComProdutoSchema,
    );
    if (cores.length === 0) {
      return respostaErro(
        404,
        "A cor escolhida não existe mais — recarregue a página e tente de novo.",
      );
    }
    const slugProduto = cores[0].produtos.slug;

    if (nomeCor?.success && nomeCor.data !== cores[0].nome) {
      const cor = cores[0];
      const variacoes = validar("variacoes:consultar-cor", await chamar(config, token, "variacoes", {
        method: "GET", params: new URLSearchParams({ select: "id,cor,cor_hex", produto_id: `eq.${cor.produto_id}`, cor_id: `eq.${corId}` }),
      }), z.array(z.object({ id: z.uuid(), cor: z.string(), cor_hex: z.string() })));
      const paramsGrupo = new URLSearchParams({ id: `eq.${corId}`, nome: `eq.${cor.nome}` });
      const atualizadas = validar("produto_cores:renomear", await chamar(config, token, "produto_cores", {
        method: "PATCH", params: paramsGrupo, representacao: true,
        corpo: { nome: nomeCor.data, cor_hex: tomDaCor(nomeCor.data) },
      }), z.array(z.object({ id: z.uuid() })));
      if (!atualizadas.length) return respostaErro(409, "A cor foi alterada em outra tela. Recarregue antes de enviar a foto.");
      try {
        await chamar(config, token, "variacoes", {
          method: "PATCH", params: new URLSearchParams({ produto_id: `eq.${cor.produto_id}`, cor_id: `eq.${corId}` }),
          corpo: { cor: nomeCor.data, cor_hex: tomDaCor(nomeCor.data) },
        });
      } catch {
        try {
          for (const variacao of variacoes) {
            await chamar(config, token, "variacoes", { method: "PATCH",
              params: new URLSearchParams({ id: `eq.${variacao.id}`, produto_id: `eq.${cor.produto_id}` }),
              corpo: { cor: variacao.cor, cor_hex: variacao.cor_hex } });
          }
          await chamar(config, token, "produto_cores", { method: "PATCH",
            params: new URLSearchParams({ id: `eq.${corId}`, nome: `eq.${nomeCor.data}` }),
            corpo: { nome: cor.nome, cor_hex: cor.cor_hex } });
        } catch {
          throw new ErroFoto(502, "Não foi possível sincronizar a cor. Confira o nome e o estoque na peça antes de continuar. Nenhuma foto foi enviada.");
        }
        throw new ErroFoto(502, "Não foi possível salvar a cor dos tamanhos. Nenhuma foto foi enviada. Recarregue e tente novamente.");
      }
      corAlterada = true;
    }

    // 4. Ordem na galeria da cor: a última + 1 (zero se for a
    //    primeira foto da cor).
    const paramsOrdem = new URLSearchParams({
      select: "ordem",
      cor_id: `eq.${corId}`,
      order: "ordem.desc",
      limit: "1",
    });
    const ultimas = validar(
      "produto_fotos:consultar-ordem",
      await chamar(config, token, "produto_fotos", {
        method: "GET",
        params: paramsOrdem,
      }),
      ordemSchema,
    );
    const ordem = (ultimas[0]?.ordem ?? -1) + 1;

    // 5. Envio ao Storage. O nome do arquivo é um uuid novo — o
    //    caminho nunca repete (unique (cor_id, caminho) no banco).
    const caminho = `fotos/${slugProduto}/${corId}/${crypto.randomUUID()}.${formato.ext}`;
    await enviarArquivo(config, token, caminho, buffer, formato.mime);

    // 6. Registro no banco. Falha → compensação apaga o arquivo
    //    que subiu (best-effort) para não deixar lixo no bucket.
    try {
      const inserida = validar(
        "produto_fotos:inserir",
        await chamar(config, token, "produto_fotos", {
          method: "POST",
          representacao: true,
          mensagemDuplicado: "Esta foto já está na galeria desta cor.",
          corpo: [{ cor_id: corId, caminho, ordem }],
        }),
        fotoInseridaSchema,
      )[0];
      return NextResponse.json(
        { ok: true, id: inserida.id, caminho, ordem },
        { status: 201 },
      );
    } catch (erroInsercao) {
      let limpou = false;
      try {
        limpou = await removerArquivo(config, token, caminho);
      } catch {
        // A limpeza é best-effort — a mensagem abaixo é honesta
        // sobre o que pode ter sobrado no armazenamento.
        limpou = false;
      }
      if (erroInsercao instanceof ErroFoto) {
        throw new ErroFoto(
          erroInsercao.status,
          limpou
            ? `${erroInsercao.mensagem} Nada foi gravado — tente de novo.`
            : `${erroInsercao.mensagem} O arquivo pode ter ficado no armazenamento sem registro no catálogo — recarregue a página e, se precisar, peça a limpeza do bucket.`,
        );
      }
      throw erroInsercao;
    }
  } catch (erro) {
    if (erro instanceof ErroFoto) {
      return respostaErro(erro.status, erro.mensagem + (corAlterada ? " O nome da cor já foi salvo. Recarregue a página antes de tentar enviar a foto novamente." : ""));
    }
    // Log de servidor: só o tipo do erro — sem corpos, sem tokens.
    console.error("[fotos] erro inesperado", {
      tipo: erro instanceof Error ? erro.name : "desconhecido",
    });
    return respostaErro(
      502,
      "Não foi possível enviar a foto agora. Tente de novo em instantes.",
    );
  }
}

// ------------------------------------------------------------
// DELETE — excluir uma foto (corpo JSON: { id })
// ------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const config = configurar();
  if (!config) {
    return respostaErro(500, "O painel não está configurado neste ambiente.");
  }

  try {
    const token = await sessaoAdmin(request);

    let bruto: unknown;
    try {
      bruto = await request.json();
    } catch {
      return respostaErro(
        400,
        "Não foi possível ler os dados da foto. Tente de novo.",
      );
    }
    const corpo = idCorpoSchema.safeParse(bruto);
    if (!corpo.success) {
      return respostaErro(
        400,
        "Informe qual foto deve ser excluída — recarregue a página e tente de novo.",
      );
    }

    // 1. A linha precisa existir — e o CAMINHO do arquivo vem
    //    dela, não do pedido.
    const paramsFoto = new URLSearchParams({
      select: "id,caminho",
      id: `eq.${corpo.data.id}`,
      limit: "1",
    });
    const fotos = validar(
      "produto_fotos:consultar",
      await chamar(config, token, "produto_fotos", {
        method: "GET",
        params: paramsFoto,
      }),
      fotoConsultadaSchema,
    );
    if (fotos.length === 0) {
      return respostaErro(
        404,
        "Esta foto já não existe no catálogo — recarregue a página.",
      );
    }
    const caminho = fotos[0].caminho;

    // 2. Arquivo primeiro: se o Storage recusar, o REGISTRO FICA
    //    (foto intacta, nova tentativa possível). 404 = o objeto
    //    já não existia → segue para limpar o registro.
    const removido = await removerArquivo(config, token, caminho);
    if (!removido) {
      return respostaErro(
        502,
        "Não foi possível apagar o arquivo do armazenamento agora. A foto NÃO foi removida do catálogo — tente de novo em instantes.",
      );
    }

    // 3. Registro por último.
    const paramsExcluir = new URLSearchParams({ id: `eq.${corpo.data.id}` });
    await chamar(config, token, "produto_fotos", {
      method: "DELETE",
      params: paramsExcluir,
    });
    return NextResponse.json({ ok: true });
  } catch (erro) {
    if (erro instanceof ErroFoto) {
      return respostaErro(erro.status, erro.mensagem);
    }
    console.error("[fotos] erro inesperado", {
      tipo: erro instanceof Error ? erro.name : "desconhecido",
    });
    return respostaErro(
      502,
      "Não foi possível excluir a foto agora. Tente de novo em instantes.",
    );
  }
}
