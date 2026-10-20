"use client";

// ============================================================
// DONA SIL — ETAPA 5c — FINALIZAÇÃO (ilha cliente)
// ============================================================
// Fluxo da finalização, SEM gravar pedido no banco:
//
//   1. Sacola revisada (informativa — os valores de verdade são
//      conferidos no servidor quando a cliente envia).
//   2. Formulário de entrega + região de frete (as faixas vêm
//      do servidor; o valor do frete NUNCA vem do navegador).
//   3. Server Action `prepararPedido` revalida TUDO com o
//      catálogo real e devolve o resumo com preços atuais.
//   4. A cliente confere o resumo e envia ao WhatsApp oficial
//      da loja, com mensagem pronta e itemizada.
//
// IMPORTANTE: não existe "pedido realizado" aqui. A tela diz
// com todas as letras que a conclusão é feita pelo atendimento
// no WhatsApp — sem número de pedido, sem confirmação falsa.
// ============================================================

import Link from "next/link";
import { useActionState, useState, type ComponentProps } from "react";
import { formatarBRL } from "@/lib/format";
import type { FaixaFrete } from "@/lib/frete";
import { useSacola } from "@/components/CarrinhoProvider";
import {
  prepararPedido,
  type ResultadoPreparar,
} from "@/app/finalizar/actions";

type Props = {
  faixas: FaixaFrete[];
};

export default function FinalizarPedido({ faixas }: Props) {
  const { itens, carregado } = useSacola();
  const [resultado, submeter, enviando] = useActionState<
    ResultadoPreparar | null,
    FormData
  >(prepararPedido, null);
  // Depois de conferir, a cliente pode voltar e editar os dados
  // (o resumo fica escondido até enviar de novo).
  const [editando, setEditando] = useState(false);

  if (!carregado) {
    return (
      <div aria-hidden="true" className="mt-8 space-y-4">
        {[0, 1, 2].map((linha) => (
          <div
            key={linha}
            className="h-24 animate-pulse rounded-2xl bg-champagne"
          />
        ))}
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="mt-8 rounded-3xl border border-sand bg-ivory px-6 py-14 text-center">
        <p className="font-display text-xl font-semibold text-ink">
          Sua sacola está vazia
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
          Separe algumas peças no catálogo e volte aqui para
          finalizar.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
        >
          Ver o catálogo
        </Link>
      </div>
    );
  }

  // Sem faixas de frete ativas: caso legítimo do banco — a
  // finalização fica bloqueada, sem inventar frete.
  if (faixas.length === 0) {
    return (
      <div
        role="alert"
        className="mt-8 rounded-3xl border border-sand bg-ivory px-6 py-14 text-center"
      >
        <p className="font-display text-xl font-semibold text-ink">
          Entrega indisponível no momento
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-ink-soft">
          Não há regiões de entrega cadastradas agora. Fale com a
          gente pelo WhatsApp que a gente resolve com você.
        </p>
        <Link
          href="/sacola"
          className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-sm font-medium text-gold-ink transition hover:bg-champagne"
        >
          Voltar à sacola
        </Link>
      </div>
    );
  }

  const errosCampos =
    resultado && !resultado.ok ? (resultado.errosCampos ?? {}) : {};
  const problemas =
    resultado && !resultado.ok ? (resultado.problemas ?? []) : [];

  // Dados da última conferência bem-sucedida. Ao clicar em "Editar
  // dados" o formulário é remontado — sem isto, os campos voltariam
  // vazios e a cliente teria que digitar tudo de novo.
  const entregaAnterior = resultado?.ok ? resultado.resumo.entrega : null;

  // Confirmação: só aparece quando a conferência deu certo e a
  // cliente não está editando os dados. Durante uma reconferência
  // (`enviando`), o resumo antigo fica ESCONDIDO — senão a
  // cliente poderia enviar pelo WhatsApp um resumo desatualizado
  // antes de o servidor devolver os valores novos.
  if (resultado?.ok && !editando && !enviando) {
    const { resumo, urlWhatsApp } = resultado;
    // A sacola pode ter mudado (outra aba, botão voltar...):
    // se mudou, o resumo antigo fica desatualizado — avisar.
    const chaveAtual = JSON.stringify(
      itens
        .map((i) => ({ v: i.variacaoId, q: i.quantidade }))
        .sort((a, b) => a.v.localeCompare(b.v)),
    );
    const chaveResumo = JSON.stringify(
      resumo.itens
        .map((i) => ({ v: i.variacaoId, q: i.quantidade }))
        .sort((a, b) => a.v.localeCompare(b.v)),
    );
    const sacolaMudou = chaveAtual !== chaveResumo;

    return (
      <section
        aria-labelledby="titulo-resumo"
        className="mt-8 rounded-3xl border border-sand bg-ivory px-6 py-8"
      >
        <h2
          id="titulo-resumo"
          className="font-display text-2xl font-semibold text-ink"
        >
          Confira o seu pedido
        </h2>

        {/* A verdade sobre esta tela: nada foi registrado ainda. */}
        <p className="mt-3 rounded-2xl border border-gold bg-champagne px-4 py-3 text-sm leading-7 text-ink">
          <strong>Seu pedido ainda NÃO foi registrado no site.</strong>{" "}
          Ao enviar no WhatsApp, o atendimento da Dona Sil confirma o
          estoque e combina o pagamento e a entrega com você.
        </p>

        {sacolaMudou && (
          <p
            role="alert"
            className="mt-3 text-sm leading-7 text-gold-ink"
          >
            A sacola mudou desde a conferência — os valores abaixo
            podem estar desatualizados. Volte e envie de novo.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {resumo.itens.map((item) => (
            <li
              key={item.variacaoId}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-sand pb-3"
            >
              <div>
                <Link
                  href={`/catalogo/${item.produtoSlug}`}
                  className="font-medium text-ink hover:text-gold-ink"
                >
                  {item.produtoNome}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">
                  Tam. {item.tamanho} — {item.cor} ·{" "}
                  {item.quantidade} × {formatarBRL(item.precoUnitario)}
                </p>
              </div>
              <p className="text-sm font-semibold text-ink">
                {formatarBRL(item.quantidade * item.precoUnitario)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-medium text-ink">
              {formatarBRL(resumo.subtotal)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">
              Frete ({resumo.frete.nome})
            </dt>
            <dd className="font-medium text-ink">
              {formatarBRL(resumo.frete.valor)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-sand pt-3">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="font-display text-2xl font-semibold text-ink">
              {formatarBRL(resumo.total)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-2xl bg-cream px-4 py-4 text-sm leading-7 text-ink-soft">
          <p className="font-semibold text-ink">Entrega</p>
          <p className="mt-1">
            {resumo.entrega.nome}
            <br />
            {resumo.entrega.endereco}
            {resumo.entrega.complemento
              ? ` — ${resumo.entrega.complemento}`
              : ""}
            {resumo.entrega.bairro ? ` — ${resumo.entrega.bairro}` : ""}
            <br />
            {resumo.entrega.cidade} — {resumo.entrega.uf} · CEP{" "}
            {resumo.entrega.cep}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={urlWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep dark:text-[#2b2420]"
          >
            Enviar pedido no WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="rounded-full border border-sand px-6 py-3 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-ink"
          >
            Editar dados
          </button>
          <Link
            href="/sacola"
            className="text-sm font-medium text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
          >
            Voltar à sacola
          </Link>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------
  // Formulário: conferência da sacola + dados de entrega.
  // ---------------------------------------------------------
  const linhasParaEnviar = JSON.stringify(
    itens.map(({ variacaoId, quantidade, produtoSlug }) => ({
      variacaoId,
      quantidade,
      produtoSlug,
    })),
  );

  return (
    <form action={submeter} className="mt-8 space-y-8">
      {/* Problemas de sacola/estoque/rede (Server Action) */}
      {problemas.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-gold bg-champagne px-4 py-3"
        >
          <ul className="space-y-2 text-sm leading-7 text-ink">
            {problemas.map((problema) => (
              <li key={problema}>{problema}</li>
            ))}
          </ul>
          <Link
            href="/sacola"
            className="mt-2 inline-block text-sm font-medium text-gold-ink underline underline-offset-2 hover:no-underline"
          >
            Abrir a sacola
          </Link>
        </div>
      )}

      {/* 1) Conferência da sacola (valores INFORMATIVOS) */}
      <section
        aria-labelledby="titulo-pecas"
        className="rounded-3xl border border-sand bg-ivory px-6 py-6"
      >
        <h2
          id="titulo-pecas"
          className="font-display text-xl font-semibold text-ink"
        >
          Peças separadas
        </h2>
        <ul className="mt-4 space-y-3">
          {itens.map((item) => (
            <li
              key={item.variacaoId}
              className="flex flex-wrap items-start justify-between gap-2"
            >
              <div>
                <p className="font-medium text-ink">{item.produtoNome}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Tam. {item.tamanho} — {item.cor} · {item.quantidade}{" "}
                  {item.quantidade === 1 ? "peça" : "peças"}
                </p>
              </div>
              <p className="text-sm font-semibold text-ink">
                {formatarBRL(item.precoUnitario * item.quantidade)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-6 text-ink-soft">
          Estes valores são da sua sacola, só no navegador. Quando
          você enviar, o servidor confere preço e estoque de novo
          com o catálogo oficial — o resumo final usa os valores
          reais de agora.
        </p>
      </section>

      {/* 2) Dados de entrega */}
      <section
        aria-labelledby="titulo-entrega"
        className="rounded-3xl border border-sand bg-ivory px-6 py-6"
      >
        <h2
          id="titulo-entrega"
          className="font-display text-xl font-semibold text-ink"
        >
          Entrega
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Nome completo"
            nome="nome"
            erro={errosCampos.nome}
            required
            maxLength={200}
            autoComplete="name"
            defaultValue={entregaAnterior?.nome}
          />
          <Campo
            rotulo="WhatsApp (com DDD)"
            nome="whatsapp"
            erro={errosCampos.whatsapp}
            type="tel"
            inputMode="tel"
            placeholder="81 99999-8888"
            required
            maxLength={30}
            autoComplete="tel"
            defaultValue={entregaAnterior?.whatsapp}
          />
          <Campo
            rotulo="CEP"
            nome="cep"
            erro={errosCampos.cep}
            inputMode="numeric"
            placeholder="52000-000"
            required
            maxLength={20}
            autoComplete="postal-code"
            defaultValue={entregaAnterior?.cep}
          />
          <Campo
            rotulo="Cidade"
            nome="cidade"
            erro={errosCampos.cidade}
            required
            maxLength={120}
            autoComplete="address-level2"
            defaultValue={entregaAnterior?.cidade}
          />
        </div>

        <div className="mt-4 grid gap-4">
          <Campo
            rotulo="Endereço (rua e número)"
            nome="endereco"
            erro={errosCampos.endereco}
            required
            maxLength={300}
            autoComplete="address-line1"
            defaultValue={entregaAnterior?.endereco}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              rotulo="Complemento"
              nome="complemento"
              erro={errosCampos.complemento}
              opcional
              maxLength={200}
              placeholder="Apto, bloco, referência…"
              autoComplete="address-line2"
              defaultValue={entregaAnterior?.complemento}
            />
            <Campo
              rotulo="Bairro"
              nome="bairro"
              erro={errosCampos.bairro}
              opcional
              maxLength={120}
              autoComplete="address-level3"
              defaultValue={entregaAnterior?.bairro}
            />
          </div>
          <div className="sm:w-40">
            <Campo
              rotulo="UF"
              nome="uf"
              erro={errosCampos.uf}
              required
              maxLength={2}
              pattern="[A-Za-z]{2}"
              title="Duas letras (ex.: PE)"
              placeholder="PE"
              autoCapitalize="characters"
              className="uppercase"
              autoComplete="address-level1"
              defaultValue={entregaAnterior?.uf}
            />
          </div>
        </div>

        {/* 3) Região de frete — valores do banco, via servidor */}
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-ink">
            Região de entrega
          </legend>
          <div className="mt-3 space-y-2">
            {faixas.map((faixa, indice) => {
              const id = `faixa-${faixa.id}`;
              return (
                <label
                  key={faixa.id}
                  htmlFor={id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-sand bg-cream px-4 py-3 text-sm transition hover:border-gold"
                >
                  <span className="flex items-center gap-3 text-ink">
                    <input
                      type="radio"
                      id={id}
                      name="faixaFreteId"
                      value={faixa.id}
                      required
                      defaultChecked={
                        entregaAnterior
                          ? entregaAnterior.faixaFreteId === faixa.id
                          : indice === 0
                      }
                      className="h-4 w-4 accent-gold"
                    />
                    {faixa.nome}
                  </span>
                  <span className="font-semibold text-ink">
                    {formatarBRL(faixa.valor)}
                  </span>
                </label>
              );
            })}
          </div>
          {errosCampos.faixaFreteId && (
            <p
              role="alert"
              className="mt-2 rounded-lg bg-champagne px-3 py-1.5 text-xs leading-5 text-ink"
            >
              {errosCampos.faixaFreteId}
            </p>
          )}
          <p className="mt-3 text-xs leading-6 text-ink-soft">
            O valor do frete é confirmado pelo servidor no envio.
          </p>
        </fieldset>
      </section>

      {/* Linhas da sacola: SÓ identificação e quantidade.
          Preço e estoque nunca vêm daqui — o servidor busca no
          catálogo oficial. */}
      <input type="hidden" name="itens" value={linhasParaEnviar} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          onClick={() => setEditando(false)}
          className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ink transition hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#2b2420]"
        >
          {enviando ? "Conferindo…" : "Conferir e continuar"}
        </button>
        <Link
          href="/sacola"
          className="text-sm font-medium text-ink-soft underline-offset-2 transition hover:text-ink hover:underline"
        >
          Voltar à sacola
        </Link>
      </div>

      <p className="text-xs leading-6 text-ink-soft">
        Ao continuar, nenhum pedido é registrado: a Dona Sil recebe
        seu pedido pelo WhatsApp e confirma tudo com você — estoque,
        pagamento e entrega.
      </p>
    </form>
  );
}

// ------------------------------------------------------------
// Campo de texto com rótulo, erro acessível e estilo da casa
// ------------------------------------------------------------

type CampoProps = {
  rotulo: string;
  nome: string;
  erro?: string;
  opcional?: boolean;
} & ComponentProps<"input">;

function Campo({ rotulo, nome, erro, opcional, ...resto }: CampoProps) {
  const idErro = `erro-${nome}`;
  return (
    <div>
      <label htmlFor={nome} className="block text-sm font-medium text-ink">
        {rotulo}
        {opcional && (
          <span className="font-normal text-ink-soft"> (opcional)</span>
        )}
      </label>
      <input
        id={nome}
        name={nome}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={`mt-2 w-full rounded-2xl border bg-ivory px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-gold ${
          erro ? "border-gold-deep" : "border-sand"
        }`}
        {...resto}
      />
      {erro && (
        <p
          id={idErro}
          role="alert"
          className="mt-2 rounded-lg bg-champagne px-3 py-1.5 text-xs leading-5 text-ink"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
