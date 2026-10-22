// ============================================================
// DONA SIL — FOTOS DOS PRODUTOS (Storage do Supabase, sem SDK)
// ============================================================
// Constantes + detecção de formato POR CONTEÚDO (magic numbers)
// + URL pública do bucket fotos-produtos + tipos da galeria.
//
// Quem usa:
//   * src/app/api/admin/fotos/route.ts — valida os BYTES do
//     upload (nunca o MIME declarado pelo navegador), monta o
//     caminho canônico e fala com o Storage via fetch nativo;
//   * src/lib/painel-crud.ts — lê produto_cores com as fotos
//     embutidas e devolve os tipos daqui;
//   * src/components/admin/FotosProduto.tsx — mostra as
//     miniaturas pela URL pública e pré-confere o tamanho.
//
// Caminho canônico (migracao-painel-1.sql, item 2):
//   fotos/<slug-do-produto>/<id-da-cor>/<uuid>.<extensao>
//
// Segurança: apenas variáveis públicas. O bucket é público para
// LER (politicas-rls.sql:189-202); escrever/excluir é decidido
// pelas políticas de Storage escrita_admin_fotos /
// exclusao_admin_fotos + existe_admin() (politicas-rls.sql:204-221).
// ============================================================

export const BUCKET_FOTOS = "fotos-produtos";

/** Limite por foto: 5 MB (5 * 1024 * 1024 bytes). */
export const LIMITE_FOTO_BYTES = 5 * 1024 * 1024;

/** Rótulo pronto para o campo de arquivo do painel. */
export const ROTULO_FORMATOS_FOTO = "JPEG, PNG ou WebP — até 5 MB";

export type FormatoFoto = {
  /** Extensão do nome do arquivo dentro do bucket. */
  ext: "jpg" | "png" | "webp";
  /** MIME declarado ao Storage — derivado dos BYTES lidos. */
  mime: "image/jpeg" | "image/png" | "image/webp";
};

/**
 * Detecta o formato real pela assinatura (magic numbers) dos
 * primeiros bytes. NÃO olha nome nem MIME declarados — um
 * ".jpg" que contém outra coisa é recusado como desconhecido.
 */
export function detectarFormatoFoto(bytes: Uint8Array): FormatoFoto | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }
  // WebP: "RIFF" nos 4 primeiros bytes + "WEBP" nos bytes 8-11.
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

/** URL pública de leitura do bucket fotos-produtos. */
export function urlPublicaFoto(caminho: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_FOTOS}/${caminho}`;
}

// ------------------------------------------------------------
// Tipos da galeria por cor (preenchidos em painel-crud; a
// vitrine pública chega em etapa futura)
// ------------------------------------------------------------

export type FotoPainel = {
  id: string;
  caminho: string;
  ordem: number;
};

export type CorPainel = {
  id: string;
  nome: string;
  hex: string;
  ordem: number;
  fotos: FotoPainel[];
};
