// ============================================================
// DONA SIL — PAINEL — PEDIDOS
// ============================================================
// Os pedidos ficam guardados com segurança no banco — a leitura
// deles é exclusiva de administradoras e chega junto com a
// integração do painel (login). Enquanto isso, esta página traz:
//   * os filtros por status já funcionando (sobre a lista vazia);
//   * a tabela preparada (nº, data, valor, status);
//   * um estado vazio verdadeiro — nenhum pedido fictício.
// ============================================================

import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { Aviso } from "@/components/admin/Aviso";
import { EstadoVazio } from "@/components/admin/EstadoVazio";
import { RotuloStatus, type TonalidadeRotulo } from "@/components/admin/RotuloStatus";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { MODO_DEMO } from "@/lib/site";

/** Status previstos no banco (tabela pedidos). */
const STATUS = [
  { valor: "pendente", rotulo: "Pendente", tonalidade: "pendente" as TonalidadeRotulo },
  { valor: "confirmada", rotulo: "Confirmada", tonalidade: "ativo" as TonalidadeRotulo },
  { valor: "enviada", rotulo: "Enviada", tonalidade: "neutro" as TonalidadeRotulo },
  { valor: "entregue", rotulo: "Entregue", tonalidade: "ativo" as TonalidadeRotulo },
  { valor: "cancelada", rotulo: "Cancelada", tonalidade: "esgotado" as TonalidadeRotulo },
  { valor: "expirada", rotulo: "Expirada", tonalidade: "esgotado" as TonalidadeRotulo },
];

function primeiroValor(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

export default function PaginaPedidos(props: PageProps<"/admin/pedidos">) {
  return (
    <>
      <TituloSecao
        titulo="Pedidos"
        descricao="Os pedidos que a loja receber ficarão listados aqui, com número, data, valor e status."
      />

      {MODO_DEMO && (
        <Aviso tonalidade="atencao" titulo="Nenhum pedido pode existir por enquanto">
          A loja está em modo demonstração: a finalização de compra é enviada por
          WhatsApp e não grava pedidos no banco. Além disso, a leitura de pedidos
          é exclusiva de administradoras — ela será integrada junto com a tela
          de entrada (login).
        </Aviso>
      )}

      <Suspense fallback={null}>
        <ConteudoPedidos searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

// ------------------------------------------------------------
// Conteúdo com filtro por status (sobre a lista vazia real)
// ------------------------------------------------------------

type PropsConteudo = Pick<PageProps<"/admin/pedidos">, "searchParams">;

async function ConteudoPedidos({ searchParams }: PropsConteudo) {
  const filtros = await searchParams;
  const statusEscolhido = primeiroValor(filtros.status);

  return (
    <>
      {/* Filtros por status — funcionam sobre a lista (vazia) e
          continuam prontos para quando os pedidos chegarem. */}
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
          {STATUS.map((status) => (
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

      {/* Tabela preparada + estado vazio verdadeiro */}
      <Tabela>
        <thead>
          <tr>
            <Th>Pedido</Th>
            <Th>Data</Th>
            <Th>Cliente</Th>
            <Th className="text-right">Valor</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td colSpan={5} className="p-0">
              <EstadoVazio
                titulo="Nenhum pedido para mostrar"
                descricao="Nenhum pedido foi criado — e nenhum dado de exemplo é exibido aqui. Quando a loja começar a vender de verdade e a leitura administrativa for integrada, os pedidos reais aparecem nesta lista."
              />
            </Td>
          </tr>
        </tbody>
      </Tabela>

      {/* Legenda dos status previstos no banco */}
      <section aria-labelledby="legenda-status" className="mt-8">
        <h2 id="legenda-status" className="text-sm font-semibold text-ink">
          Status de pedido previstos no banco
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {STATUS.map((status) => (
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
