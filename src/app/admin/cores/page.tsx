// ============================================================
// DONA SIL — PAINEL — CORES E VARIAÇÕES
// ============================================================
// Seção dedicada ao modelo de cores previsto para o painel:
//   * produto_cores — uma linha por cor de cada peça
//     (nome, cor_hex, ordem) — criada pela migração M1;
//   * produto_fotos — várias fotos por cor (Storage, Etapa 10);
//   * variacoes — estoque por tamanho + cor; após a migração M2
//     cada variação ganha cor_id ligando-a à sua cor.
//
// Nesta etapa visual:
//   * a tabela de cores mostra o estado preparado (a M2 ainda
//     não foi aplicada — nada é inventado aqui);
//   * as cores que as peças têm HOJE são reais, lidas do
//     catálogo (texto legado das variações);
//   * o estoque detalhado fica na página de cada peça e entra
//     aqui com a leitura administrativa integrada.
// ============================================================

import { Suspense } from "react";
import { Aviso } from "@/components/admin/Aviso";
import { AvisoErroCarregando } from "@/components/admin/AvisoErroCarregando";
import { EstadoVazio } from "@/components/admin/EstadoVazio";
import { Tabela, Td, Th } from "@/components/admin/Tabela";
import { TituloSecao } from "@/components/admin/TituloSecao";
import { listarProdutos, type ProdutoResumo } from "@/lib/catalogo";

export default function PaginaCores() {
  return (
    <>
      <TituloSecao
        titulo="Cores e variações"
        descricao="Como as cores, os tamanhos e o estoque estão organizados na loja — e como ficarão no painel."
      />

      <Aviso titulo="Nova estrutura de cores em preparação">
        O banco já tem as tabelas <strong>produto_cores</strong> e{" "}
        <strong>produto_fotos</strong> (migração M1 aplicada). A migração M2 vai
        preencher essas tabelas automaticamente a partir das cores que as peças já
        têm hoje. Até lá, esta página mostra as cores reais de cada peça e deixa
        as demais áreas prontas.
      </Aviso>

      {/* Área 1 — cores reais que as peças têm hoje (texto legado) */}
      <section aria-labelledby="cores-hoje" className="mt-10">
        <h2 id="cores-hoje" className="font-display text-xl font-semibold text-ink">
          Cores que as peças têm hoje
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Leitura real do catálogo. Esta lista vem do texto de cor de cada
          variação — é o que a loja usa até a migração M2 organizar tudo na
          tabela nova.
        </p>

        <div className="mt-4">
          <Suspense fallback={<EsqueletoTabela />}>
            <TabelaCoresReais />
          </Suspense>
        </div>
      </section>

      {/* Área 2 — tabela nova produto_cores (estado preparado) */}
      <section aria-labelledby="cores-tabela" className="mt-10">
        <h2 id="cores-tabela" className="font-display text-xl font-semibold text-ink">
          Cores por peça (tabela nova)
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Depois da migração M2, cada peça terá suas cores aqui com nome, amostra
          hexadecimal, ordem de exibição, quantas variações usam a cor e quantas
          fotos ela tem — tudo editável no painel.
        </p>

        <div className="mt-4">
          <Tabela>
            <thead>
              <tr>
                <Th>Peça</Th>
                <Th>Cor</Th>
                <Th className="w-16">Amostra</Th>
                <Th className="text-right">Ordem</Th>
                <Th className="text-right">Variações</Th>
                <Th className="text-right">Fotos</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td colSpan={6} className="p-0">
                  <EstadoVazio
                    titulo="Nenhuma cor na tabela nova por enquanto"
                    descricao="As cores entram aqui quando a migração M2 for aplicada e a leitura administrativa for integrada ao painel. As peças da loja continuam mostrando suas cores normalmente."
                  />
                </Td>
              </tr>
            </tbody>
          </Tabela>
        </div>
      </section>

      {/* Área 3 — tamanhos e estoque */}
      <section aria-labelledby="estoque-variacoes" className="mt-10">
        <h2 id="estoque-variacoes" className="font-display text-xl font-semibold text-ink">
          Tamanhos e estoque
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          O estoque fica guardado por variação (peça + tamanho + cor).
        </p>
        <div className="mt-4">
          <EstadoVazio
            titulo="Estoque detalhado fica na página de cada peça"
            descricao="Hoje você confere o estoque de cada peça em Produtos → Editar, que mostra a tabela real de tamanhos, cores e quantidades. A visão geral de estoque aqui entra junto com a leitura administrativa do painel."
          />
        </div>
      </section>

      {/* Área 4 — fotos por cor */}
      <section aria-labelledby="fotos-cor" className="mt-10">
        <h2 id="fotos-cor" className="font-display text-xl font-semibold text-ink">
          Fotos por cor
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
          Cada cor vai receber várias fotos, na ordem que você escolher — a peça
          muda de foto junto com a cor selecionada.
        </p>
        <div className="mt-4">
          <EstadoVazio
            titulo="Fotos chegam com o armazenamento (Etapa 10)"
            descricao="O upload de fotos por cor será habilitado quando o Storage estiver pronto. Por enquanto a loja usa a foto demonstrativa."
          />
        </div>
      </section>
    </>
  );
}

// ------------------------------------------------------------
// Cores reais por peça (leitura pública, dentro de Suspense)
// ------------------------------------------------------------

async function TabelaCoresReais() {
  let produtos: ProdutoResumo[];
  try {
    produtos = await listarProdutos();
  } catch (erro) {
    return <AvisoErroCarregando oQue="as cores" erro={erro} />;
  }

  const linhas = produtos.flatMap((produto) =>
    produto.cores.map((cor) => ({
      produto: produto.nome,
      cor: cor.nome,
      corHex: cor.hex,
    })),
  );

  if (linhas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma cor cadastrada"
        descricao="Quando as peças tiverem variações com cores, elas aparecem aqui automaticamente."
      />
    );
  }

  return (
    <>
      <Tabela>
        <thead>
          <tr>
            <Th>Peça</Th>
            <Th>Cor</Th>
            <Th className="w-16">Amostra</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={`${linha.produto}-${linha.cor}`}>
              <Td className="font-medium">{linha.produto}</Td>
              <Td className="text-ink-soft">{linha.cor}</Td>
              <Td>
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 rounded-full border border-black/10"
                  style={{ backgroundColor: linha.corHex }}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
      <p className="mt-4 text-xs leading-6 text-ink-soft">
        {linhas.length} cores em {produtos.length} peças ativas — leitura
        pública do catálogo (texto legado das variações).
      </p>
    </>
  );
}

function EsqueletoTabela() {
  return (
    <div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-champagne" />
  );
}
