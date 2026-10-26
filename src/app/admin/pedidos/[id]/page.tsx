// ============================================================
// DONA SIL — PAINEL — DETALHES DE UM PEDIDO
// ============================================================
// Dados REAIS do pedido pela LEITURA ADMINISTRATIVA (token
// httpOnly da sessão — ver src/lib/painel-crud.ts): itens
// congelados na compra, totais, frete e entrega. Somente
// leitura: não há grant de escrita em pedidos e a edição de
// status chega junto com a integração de escrita do painel.
//
// Id inválido ou pedido inexistente = 404 (notFound). Falhas de
// sessão/rede/banco = Aviso com mensagem honesta — nunca uma
// tela "fingida" de pedido.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatarBRL } from "@/lib/format";
import {
  PainelErro,
  obterPedidoPainel,
  type PedidoDetalhePainel,
  type StatusPedido,
} from "@/lib/painel-crud";
import { Aviso } from "@/components/admin/Aviso";
import { RotuloStatus, type TonalidadeRotulo } from "@/components/admin/RotuloStatus";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";

export const metadata: Metadata = {
  title: "Detalhes do pedido",
};

/** Rótulo e cor de cada status — mesmo mapa da lista de pedidos
 *  (mesma prática das páginas de produtos, que repetem o AvisoErro
 *  local: apresentação fica na página, dado fica no painel-crud). */
const ROTULOS: Record<
  StatusPedido,
  { rotulo: string; tonalidade: TonalidadeRotulo }
> = {
  pendente: { rotulo: "Pendente", tonalidade: "pendente" },
  confirmada: { rotulo: "Confirmada", tonalidade: "ativo" },
  enviada: { rotulo: "Enviada", tonalidade: "neutro" },
  entregue: { rotulo: "Entregue", tonalidade: "ativo" },
  cancelada: { rotulo: "Cancelada", tonalidade: "esgotado" },
  expirada: { rotulo: "Expirada", tonalidade: "esgotado" },
};

/** Data/hora no fuso da loja (Recife) — a página roda no servidor. */
const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});

function formatarData(data: Date): string {
  return FORMATO_DATA.format(data);
}

export default function PaginaDetalhePedido(
  props: PageProps<"/admin/pedidos/[id]">,
) {
  return (
    <>
      <nav aria-label="Voltar para a lista de pedidos">
        <Link
          href="/admin/pedidos"
          className="text-sm font-medium text-gold-ink hover:underline"
        >
          ← Voltar para Pedidos
        </Link>
      </nav>

      <Suspense fallback={<EsqueletoPedido />}>
        <ConteudoPedido params={props.params} />
      </Suspense>
    </>
  );
}

type PropsConteudo = Pick<PageProps<"/admin/pedidos/[id]">, "params">;

async function ConteudoPedido({ params }: PropsConteudo) {
  const { id } = await params;

  let pedido: PedidoDetalhePainel | null;
  try {
    pedido = await obterPedidoPainel(id);
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  // Id fora do formato ou pedido inexistente: 404.
  if (!pedido) {
    notFound();
  }

  const rotulo = ROTULOS[pedido.status];

  return (
    <>
      <div className="mt-4">
        <TituloSecao
          titulo={`Pedido ${pedido.codigo}`}
          descricao={`Criado em ${formatarData(pedido.criadoEm)} — dados reais do banco, pela leitura de administradora.`}
          acoes={
            <RotuloStatus tonalidade={rotulo.tonalidade}>
              {rotulo.rotulo}
            </RotuloStatus>
          }
        />
      </div>

      {/* Peças do pedido: foto congelada na hora da compra */}
      <section aria-labelledby="titulo-itens" className="mt-8">
        <h2 id="titulo-itens" className="text-sm font-semibold text-ink">
          Peças do pedido
        </h2>
        <Tabela>
          <thead>
            <tr>
              <Th>Peça</Th>
              <Th>Tamanho</Th>
              <Th>Cor</Th>
              <Th className="text-right">Quantidade</Th>
              <Th className="text-right">Preço unitário</Th>
              <Th className="text-right">Subtotal</Th>
            </tr>
          </thead>
          <tbody>
            {pedido.itens.map((item) => (
              <tr key={item.id}>
                <Td className="font-medium">{item.produtoNome}</Td>
                <Td>{item.tamanho}</Td>
                <Td>{item.cor}</Td>
                <Td className="text-right">{item.quantidade}</Td>
                <Td className="text-right">{formatarBRL(item.precoUnitario)}</Td>
                <Td className="text-right">
                  {formatarBRL(item.quantidade * item.precoUnitario)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </section>

      {/* Totais congelados na compra */}
      <section aria-labelledby="titulo-totais" className="mt-6">
        <h2 id="titulo-totais" className="text-sm font-semibold text-ink">
          Valores
        </h2>
        <dl className="mt-3 max-w-sm space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-medium text-ink">
              {formatarBRL(pedido.subtotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Frete ({pedido.freteNome})</dt>
            <dd className="font-medium text-ink">
              {pedido.freteValor === 0 ? "Grátis" : formatarBRL(pedido.freteValor)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-sand pt-3">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {formatarBRL(pedido.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Cliente e entrega */}
      <section aria-labelledby="titulo-entrega" className="mt-8">
        <h2 id="titulo-entrega" className="text-sm font-semibold text-ink">
          Cliente e entrega
        </h2>
        <div className="mt-3 max-w-xl rounded-2xl bg-cream px-4 py-4 text-sm leading-7 text-ink-soft">
          <p className="font-medium text-ink">
            {pedido.nomeCliente} · {pedido.whatsapp}
          </p>
          <p className="mt-1">
            {pedido.endereco}
            {pedido.complemento ? ` — ${pedido.complemento}` : ""}
            {pedido.bairro ? ` — ${pedido.bairro}` : ""}
            <br />
            {pedido.cidade} — {pedido.uf} · CEP {pedido.cep}
          </p>
        </div>
      </section>

      <p className="mt-8 text-xs leading-6 text-ink-soft">
        A edição de status (confirmar, marcar como enviada etc.) chega junto com
        a integração de escrita do painel.
      </p>
    </>
  );
}

// ------------------------------------------------------------
// Estados auxiliares
// ------------------------------------------------------------

function AvisoErro({ erro }: { erro: unknown }) {
  const mensagem =
    erro instanceof PainelErro
      ? erro.message
      : "Não foi possível carregar o pedido agora.";
  const semSessao = erro instanceof PainelErro && erro.tipo === "sessao";
  return (
    <Aviso tonalidade="atencao" titulo="Pedido indisponível no momento">
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

function EsqueletoPedido() {
  return (
    <div aria-hidden="true" className="mt-4 animate-pulse">
      <div className="h-40 rounded-3xl bg-champagne" />
      <div className="mt-6 h-64 rounded-3xl bg-champagne" />
    </div>
  );
}
