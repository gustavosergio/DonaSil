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
import { io } from "next/cache";
import { Indicador } from "@/components/admin/Indicador";
import { Aviso } from "@/components/admin/Aviso";
import { TituloSecao } from "@/components/admin/TituloSecao";
import {
  IconeEngrenagem,
  IconeMarcador,
  IconeSacola,
  IconeTag,
} from "@/components/admin/Icones";
import { CatalogoErro, listarCategorias } from "@/lib/catalogo";
import { listarProdutosPainel, PainelErro } from "@/lib/painel-crud";

export default function PaginaVisaoGeral() {
  return (
    <>
      <TituloSecao
        titulo="Olá! Este é o painel da Dona Sil."
        descricao="Cadastre peças, edite os dados, envie fotos e ajuste o estoque em Produtos. As vendas desta versão são concluídas pelo atendimento no WhatsApp."
      />
      <Aviso titulo="Confirme a venda e atualize o estoque">
        Os pedidos chegam pelo WhatsApp e não reservam as peças automaticamente.
        Antes de confirmar uma reserva ou venda, abra Produtos e ajuste o estoque.
        Para a última unidade, coloque quantidade 0. Se a reserva for cancelada,
        devolva a unidade ao estoque. Faça o mesmo nas vendas realizadas fora do site.
      </Aviso>


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
  // Indicadores dependem do catálogo de cada requisição, não do ambiente
  // disponível durante a compilação (que pode não ter credenciais).
  await io();
  let produtos: Awaited<ReturnType<typeof listarProdutosPainel>>;
  let categorias: Awaited<ReturnType<typeof listarCategorias>>;
  try {
    [produtos, categorias] = await Promise.all([
      listarProdutosPainel(),
      listarCategorias(),
    ]);
  } catch (erro) {
    // Configuração ausente e indisponibilidade do catálogo não devem
    // derrubar o painel nem ser apresentadas como contadores zerados.
    // Erros internos do Next continuam propagando normalmente.
    if (!(erro instanceof CatalogoErro) && !(erro instanceof PainelErro)) throw erro;
    return (
      <Aviso tonalidade="atencao" titulo="Não foi possível carregar os indicadores">
        {erro.message} Recarregue a página depois de verificar a configuração
        ou a conexão do catálogo.
      </Aviso>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Indicador
        valor={produtos.filter((produto) => produto.ativo && !produto.demo).length}
        rotulo="Produtos ativos"
        nota="Peças reais visíveis na loja."
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
