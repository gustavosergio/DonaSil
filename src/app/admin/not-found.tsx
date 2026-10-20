// ============================================================
// DONA SIL — PAINEL — PÁGINA NÃO ENCONTRADA
// ============================================================
// Aparece quando uma rota dentro de /admin não existe — por
// exemplo, um produto antigo que saiu do catálogo.
// ============================================================

import { BotaoLink } from "@/components/admin/Botao";

export default function NaoEncontradoPainel() {
  return (
    <div className="rounded-2xl border border-dashed border-sand bg-ivory px-6 py-14 text-center">
      <p className="font-display text-xl font-semibold text-ink">
        Página não encontrada
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-ink-soft">
        O endereço acessado não existe no painel. Volte para a visão
        geral e use o menu para chegar onde quer.
      </p>
      <div className="mt-6 flex justify-center">
        <BotaoLink href="/admin">Voltar ao início do painel</BotaoLink>
      </div>
    </div>
  );
}
