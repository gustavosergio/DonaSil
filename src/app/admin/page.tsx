// ============================================================
// DONA SIL — PAINEL — VISÃO GERAL
// ============================================================
// Saudação, indicadores reais (produtos ativos e categorias
// vêm do banco; pedidos ainda não têm leitura no painel) e
// atalhos para as seções. Nenhum número é inventado: o que
// não tem fonte de dados aparece com "—" e uma explicação.
// ============================================================

import Link from "next/link";
import { Suspense } from "react";
import { Indicador } from "@/components/admin/Indicador";
import { Aviso } from "@/components/admin/Aviso";
import { TituloSecao } from "@/components/admin/TituloSecao";
import {
  IconeEngrenagem,
  IconeMarcador,
  IconePaleta,
  IconeSacola,
  IconeTag,
} from "@/components/admin/Icones";
import { listarCategorias, listarProdutos } from "@/lib/catalogo";
import { MODO_DEMO } from "@/lib/site";

export default function PaginaVisaoGeral() {
  return (
    <>
      <TituloSecao
        titulo="Olá! Este é o painel da Dona Sil."
        descricao="Aqui você vai cuidar do catálogo, das categorias, das cores e dos pedidos da loja. O painel está tomando forma: as páginas estão prontas, a entrada já exige a sua conta de administradora, e o cadastro de peças novas já grava no banco. A edição e as demais gravações chegam nas próximas etapas."
      />

      {MODO_DEMO && (
        <Aviso tonalidade="atencao" titulo="Modo demonstração">
          O catálogo atual usa peças fictícias para testar a loja antes do
          lançamento. Elas continuam visíveis no site — nada muda por enquanto.
        </Aviso>
      )}

      <div className="mt-8">
        <Suspense fallback={<EsqueletoIndicadores />}>
          <IndicadoresReais />
        </Suspense>
      </div>

      <Atalhos />
    </>
  );
}

// ------------------------------------------------------------
// Indicadores reais (leitura no banco, dentro de Suspense)
// ------------------------------------------------------------

async function IndicadoresReais() {
  const [produtos, categorias] = await Promise.all([
    listarProdutos(),
    listarCategorias(),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Indicador
        valor={produtos.length}
        rotulo="Produtos ativos"
        nota="Peças visíveis na loja (demonstração incluída)."
        href="/admin/produtos"
      />
      <Indicador
        valor={categorias.length}
        rotulo="Categorias"
        nota="Grupos do catálogo."
        href="/admin/categorias"
      />
      <Indicador
        valor="—"
        rotulo="Pedidos"
        nota="A leitura de pedidos chega com a integração do painel."
        href="/admin/pedidos"
      />
    </div>
  );
}

function EsqueletoIndicadores() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((indice) => (
        <div key={indice} className="h-28 animate-pulse rounded-2xl bg-champagne" />
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Atalhos para as seções
// ------------------------------------------------------------

const ATALHOS = [
  {
    href: "/admin/produtos",
    titulo: "Produtos",
    descricao: "Ver a lista, buscar peças e preparar o cadastro.",
    icone: IconeTag,
  },
  {
    href: "/admin/categorias",
    titulo: "Categorias",
    descricao: "Conferir os grupos do catálogo e editar nomes.",
    icone: IconeMarcador,
  },
  {
    href: "/admin/cores",
    titulo: "Cores e variações",
    descricao: "Cores por peça, tamanhos e estoque.",
    icone: IconePaleta,
  },
  {
    href: "/admin/pedidos",
    titulo: "Pedidos",
    descricao: "Os pedidos aparecem quando a leitura for integrada.",
    icone: IconeSacola,
  },
  {
    href: "/admin/configuracoes",
    titulo: "Configurações",
    descricao: "Informações da loja e sinalizações da etapa atual.",
    icone: IconeEngrenagem,
  },
] as const;

function Atalhos() {
  return (
    <section aria-labelledby="atalhos-painel" className="mt-10">
      <h2 id="atalhos-painel" className="font-display text-xl font-semibold text-ink">
        Atalhos
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {ATALHOS.map((atalho) => {
          const Icone = atalho.icone;
          return (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="flex h-full items-start gap-4 rounded-2xl border border-sand bg-ivory px-5 py-4 transition hover:border-gold"
              >
                <Icone className="mt-0.5 h-6 w-6 shrink-0 text-gold-ink" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{atalho.titulo}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-ink-soft">
                    {atalho.descricao}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
