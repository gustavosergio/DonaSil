// ============================================================
// DONA SIL — PAINEL — PEDIDOS
// ============================================================
// Lista REAL dos pedidos pela LEITURA ADMINISTRATIVA (token
// httpOnly da sessão — ver src/lib/painel-crud.ts): número,
// data, cliente, valor e status, com filtro por status pela URL
// (funciona sem JavaScript).
//
// Somente administradoras chegam até aqui: o portão
// (src/proxy.ts) exige sessão, e quem decide a leitura é o
// POSTGRES (política leitura_admin_pedidos — SELECT para
// authenticated, USING existe_admin). A tabela não tem grant de
// escrita: este painel NÃO altera pedidos.
//
// A loja está em modo demonstração: o checkout é concluído pelo
// WhatsApp e NÃO grava pedidos — a lista real fica vazia até a
// integração de gravação (etapa futura). Nenhum pedido fictício
// é exibido, em nenhuma circunstância.
// ============================================================

import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { formatarBRL } from "@/lib/format";
import {
  PainelErro,
  STATUS_PEDIDO,
  listarPedidosPainel,
  type PedidoResumoPainel,
  type StatusPedido,
} from "@/lib/painel-crud";
import { Aviso } from "@/components/admin/Aviso";
import { BotaoLink } from "@/components/admin/Botao";
import { EstadoVazio } from "@/components/admin/EstadoVazio";
import { IconeOlho } from "@/components/admin/Icones";
import { RotuloStatus, type TonalidadeRotulo } from "@/components/admin/RotuloStatus";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { MODO_DEMO } from "@/lib/site";

/** Rótulo e cor de cada status previsto no banco. */
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

/** Chips de filtro — derivados da fonte única (painel-crud.ts). */
const CHIPS = STATUS_PEDIDO.map((valor) => ({ valor, ...ROTULOS[valor] }));

/** Data/hora no fuso da loja (Recife) — a página roda no servidor. */
const FORMATO_DATA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Recife",
});

function formatarData(data: Date): string {
  return FORMATO_DATA.format(data);
}

function primeiroValor(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

export default function PaginaPedidos(props: PageProps<"/admin/pedidos">) {
  return (
    <>
      <TituloSecao
        titulo="Pedidos"
        descricao="Os pedidos reais do banco — número, data, cliente, valor e status — pela leitura exclusiva de administradoras."
      />

      {MODO_DEMO && (
        <Aviso tonalidade="atencao" titulo="Nenhum pedido pode existir por enquanto">
          A loja está em modo demonstração: a finalização de compra é enviada por
          WhatsApp e não grava pedidos no banco. A lista abaixo lê os pedidos
          REAIS do banco — e, por enquanto, nenhum pode existir.
        </Aviso>
      )}

      <Suspense fallback={<EsqueletoPedidos />}>
        <ConteudoPedidos searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

// ------------------------------------------------------------
// Conteúdo: lista real + filtro por status pela URL
// ------------------------------------------------------------

type PropsConteudo = Pick<PageProps<"/admin/pedidos">, "searchParams">;

async function ConteudoPedidos({ searchParams }: PropsConteudo) {
  const filtros = await searchParams;
  const statusEscolhido = primeiroValor(filtros.status);
  const comFiltro = statusEscolhido !== null;

  // Lista REAL — somente leitura com o token da sessão. O filtro
  // de status roda no banco; valor fora da lista canônica é
  // ignorado (equivale a "todos"). Erros NUNCA viram lista vazia.
  let pedidos: PedidoResumoPainel[];
  try {
    pedidos = await listarPedidosPainel({
      status: statusEscolhido ?? undefined,
    });
  } catch (erro) {
    return <AvisoErro erro={erro} />;
  }

  return (
    <>
      {/* Filtros por status — pela URL, funciona sem JavaScript. */}
      <nav aria-label="Filtrar pedidos por status" className="my-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/pedidos"
              aria-current={statusEscolhido === null ? "page" : undefined}
              className={
                statusEscolhido === null
                  ? "rounded-full border border-gold bg-gold px-4 py-2 text-sm font-medium text-ink dark:text-[#2b2420]"
                  : "rounded-full border border-sand bg-ivory px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-gold-ink"
              }
            >
              Todos
            </Link>
          </li>
          {CHIPS.map((status) => (
            <li key={status.valor}>
              <Link
                href={`/admin/pedidos?status=${status.valor}` as Route<"/admin/pedidos">}
                aria-current={statusEscolhido === status.valor ? "page" : undefined}
                className={
                  statusEscolhido === status.valor
                    ? "rounded-full border border-gold bg-gold px-4 py-2 text-sm font-medium text-ink dark:text-[#2b2420]"
                    : "rounded-full border border-sand bg-ivory px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-gold-ink"
                }
              >
                {status.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Lista real + estado vazio verdadeiro */}
      {pedidos.length > 0 ? (
        <Tabela>
          <thead>
            <tr>
              <Th>Pedido</Th>
              <Th>Data</Th>
              <Th>Cliente</Th>
              <Th className="text-right">Valor</Th>
              <Th>Status</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.id}>
                <Td className="font-medium">{pedido.codigo}</Td>
                <Td className="text-ink-soft">{formatarData(pedido.criadoEm)}</Td>
                <Td>{pedido.nomeCliente}</Td>
                <Td className="text-right">{formatarBRL(pedido.total)}</Td>
                <Td>
                  <RotuloStatus tonalidade={ROTULOS[pedido.status].tonalidade}>
                    {ROTULOS[pedido.status].rotulo}
                  </RotuloStatus>
                </Td>
                <Td>
                  <div className="flex justify-end gap-2">
                    <BotaoLink
                      href={`/admin/pedidos/${pedido.id}` as Route<"/admin/pedidos/[id]">}
                      tamanho="compacto"
                      variante="secundario"
                      aria-label={`Ver detalhes do pedido ${pedido.codigo}`}
                    >
                      <IconeOlho className="h-3.5 w-3.5" />
                      Detalhes
                    </BotaoLink>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      ) : (
        <EstadoVazio
          titulo={comFiltro ? "Nenhum pedido com este status" : "Nenhum pedido ainda"}
          descricao={
            comFiltro
              ? "Nenhum pedido tem este status agora — limpe o filtro para ver todos os pedidos."
              : "Nenhum pedido foi criado — e nenhum dado de exemplo é exibido aqui. Quando a loja começar a vender de verdade, os pedidos reais aparecem nesta lista."
          }
          acao={
            comFiltro ? (
              <BotaoLink href="/admin/pedidos" variante="secundario">
                Limpar filtro
              </BotaoLink>
            ) : undefined
          }
        />
      )}

      <p className="mt-4 text-xs leading-6 text-ink-soft">
        {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} no banco
        {comFiltro ? " com este status" : ""}.
      </p>

      {/* Legenda dos status previstos no banco */}
      <section aria-labelledby="legenda-status" className="mt-8">
        <h2 id="legenda-status" className="text-sm font-semibold text-ink">
          Status de pedido previstos no banco
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((status) => (
            <li key={status.valor}>
              <RotuloStatus tonalidade={status.tonalidade}>{status.rotulo}</RotuloStatus>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-6 text-ink-soft">
          A edição de status (confirmar, marcar como enviada etc.) chega junto
          com a integração de escrita do painel.
        </p>
      </section>
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
      : "Não foi possível carregar a lista de pedidos agora.";
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

function EsqueletoPedidos() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="my-6 flex gap-2">
        <div className="h-11 w-20 rounded-full bg-champagne" />
        <div className="h-11 w-28 rounded-full bg-champagne" />
        <div className="h-11 w-24 rounded-full bg-champagne" />
        <div className="h-11 w-28 rounded-full bg-champagne" />
      </div>
      <div className="h-72 rounded-2xl bg-champagne" />
    </div>
  );
}
