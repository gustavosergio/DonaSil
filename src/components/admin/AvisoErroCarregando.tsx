// ============================================================
// DONA SIL — PAINEL — AVISO DE ERRO DE CARREGAMENTO
// ============================================================
// Mensagem padrão quando uma consulta do catálogo falha no
// painel. Falha de consulta NUNCA é mostrada como "sem dados".
// ============================================================

import { Aviso } from "./Aviso";
import { CatalogoErro } from "@/lib/catalogo";

export function AvisoErroCarregando({
  oQue,
  erro,
}: {
  /** O que estava sendo carregado, já no plural. Ex.: "as categorias". */
  oQue: string;
  erro: unknown;
}) {
  const mensagem =
    erro instanceof CatalogoErro
      ? erro.message
      : `Não foi possível carregar ${oQue} agora.`;
  return (
    <Aviso tonalidade="atencao" titulo="Conteúdo indisponível no momento">
      {mensagem} Recarregue a página em alguns instantes.
    </Aviso>
  );
}
