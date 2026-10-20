"use client";

// ============================================================
// DONA SIL — PAINEL — FORMULÁRIO DE PRODUTO (VISUAL)
// ============================================================
// Formulário completo de cadastro/edição com validação LOCAL:
//   * nome obrigatório, preço válido, categoria obrigatória;
//   * seleção de CORES e TAMANHOS: as opções vêm das variações
//     reais da loja (prop `coresDisponiveis` / `tamanhosDisponiveis`)
//     — nenhuma opção é inventada aqui;
//   * na edição, as seleções atuais da peça já vêm marcadas
//     (props `coresSelecionadasIniciais` / `tamanhosSelecionadosIniciais`);
//   * ao "salvar", apenas confere os campos e explica que a
//     gravação no banco chega com a integração do painel.
// NADA é enviado — nenhum fetch, nenhum cadastro fingido.
// ============================================================

import { useState, type FormEvent } from "react";
import type { CategoriaResumo, CorPeca } from "@/lib/catalogo";
import { Aviso } from "./Aviso";
import { Botao, BotaoLink } from "./Botao";
import { CampoArea, CampoCheckbox, CampoSelect, CampoTexto } from "./Campo";
import { IconeCheck } from "./Icones";

/** Converte texto de preço ("189,90", "R$ 1.299,00", "129.90") em número. */
function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "");
  if (!limpo) return null;
  const comVirgula = limpo.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const valor = Number(comVirgula);
  return Number.isFinite(valor) ? valor : null;
}

export type ValoresProduto = {
  nome: string;
  preco: string;
  categoriaSlug: string;
  descricao: string;
  composicao: string;
  cuidados: string;
  /** Status visual — a gravação real chega com a integração. */
  status: "ativo" | "rascunho";
  destaque: boolean;
};

export function FormularioProduto({
  modo,
  categorias,
  coresDisponiveis,
  tamanhosDisponiveis,
  valoresIniciais,
  coresSelecionadasIniciais = [],
  tamanhosSelecionadosIniciais = [],
}: {
  modo: "novo" | "edicao";
  categorias: CategoriaResumo[];
  coresDisponiveis: CorPeca[];
  tamanhosDisponiveis: string[];
  valoresIniciais?: ValoresProduto;
  /** Nomes das cores que a peça já tem hoje (modo edição). */
  coresSelecionadasIniciais?: string[];
  /** Tamanhos que a peça já tem hoje (modo edição). */
  tamanhosSelecionadosIniciais?: string[];
}) {
  const [valores, setValores] = useState<ValoresProduto>(
    valoresIniciais ?? {
      nome: "",
      preco: "",
      categoriaSlug: "",
      descricao: "",
      composicao: "",
      cuidados: "",
      status: "ativo",
      destaque: false,
    },
  );
  const [coresSelecionadas, setCoresSelecionadas] =
    useState<string[]>(coresSelecionadasIniciais);
  const [tamanhosSelecionados, setTamanhosSelecionados] =
    useState<string[]>(tamanhosSelecionadosIniciais);
  const [erros, setErros] = useState<{ nome?: string; preco?: string; categoriaSlug?: string }>({});
  const [conferido, setConferido] = useState(false);

  function atualizar<K extends keyof ValoresProduto>(campo: K, valor: ValoresProduto[K]) {
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
  }

  /** Liga/desliga uma cor mantendo a ordem das opções. */
  function alternarCor(nome: string) {
    setConferido(false);
    setCoresSelecionadas((atuais) =>
      atuais.includes(nome)
        ? atuais.filter((cor) => cor !== nome)
        : [...atuais, nome],
    );
  }

  /** Liga/desliga um tamanho mantendo a ordem das opções. */
  function alternarTamanho(nome: string) {
    setConferido(false);
    setTamanhosSelecionados((atuais) =>
      atuais.includes(nome)
        ? atuais.filter((tamanho) => tamanho !== nome)
        : [...atuais, nome],
    );
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setConferido(false);

    const novosErros: typeof erros = {};
    if (valores.nome.trim().length < 2) {
      novosErros.nome = "Informe o nome da peça (ao menos 2 letras).";
    }
    const preco = paraNumero(valores.preco);
    if (valores.preco.trim() === "") {
      novosErros.preco = "Informe o preço da peça.";
    } else if (preco === null || preco <= 0) {
      novosErros.preco = "Preço inválido — use números, por exemplo: 189,90.";
    }
    if (!valores.categoriaSlug) {
      novosErros.categoriaSlug = "Escolha uma categoria.";
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length === 0) {
      setConferido(true);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-5">
      <Aviso titulo="Formulário em preparação">
        {modo === "novo"
          ? "O cadastro no banco será habilitado junto com as migrações do painel e a tela de entrada (login). Por enquanto este formulário apenas confere os campos — nada é salvo."
          : "As alterações serão gravadas quando a edição for conectada ao banco. Por enquanto este formulário apenas confere os campos — nada é salvo."}
      </Aviso>

      {conferido && (
        <Aviso tonalidade="info" titulo="Campos conferidos">
          Tudo certo! Cores escolhidas: {coresSelecionadas.length === 0
            ? "nenhuma"
            : coresSelecionadas.join(", ")}
          {" · "}Tamanhos escolhidos:{" "}
          {tamanhosSelecionados.length === 0
            ? "nenhum"
            : tamanhosSelecionados.join(", ")}
          . Quando a gravação for conectada, essas escolhas definem as
          variações da peça. Nada foi gravado no banco.
        </Aviso>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoTexto
          id="produto-nome"
          rotulo="Nome da peça"
          required
          value={valores.nome}
          onChange={(evento) => atualizar("nome", evento.target.value)}
          erro={erros.nome}
          placeholder="Ex.: Vestido Midi Aurora"
        />
        <CampoTexto
          id="produto-preco"
          rotulo="Preço (R$)"
          required
          inputMode="decimal"
          value={valores.preco}
          onChange={(evento) => atualizar("preco", evento.target.value)}
          erro={erros.preco}
          placeholder="Ex.: 189,90"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoSelect
          id="produto-categoria"
          rotulo="Categoria"
          required
          value={valores.categoriaSlug}
          onChange={(evento) => atualizar("categoriaSlug", evento.target.value)}
          erro={erros.categoriaSlug}
        >
          <option value="">Escolha uma categoria…</option>
          {categorias.map((categoria) => (
            <option key={categoria.slug} value={categoria.slug}>
              {categoria.nome}
            </option>
          ))}
        </CampoSelect>
        <CampoSelect
          id="produto-status"
          rotulo="Status"
          value={valores.status}
          onChange={(evento) => atualizar("status", evento.target.value as ValoresProduto["status"])}
          dica="Rascunho = invisível na loja. A gravação real chega com a integração."
        >
          <option value="ativo">Ativo (visível na loja)</option>
          <option value="rascunho">Rascunho (em preparação)</option>
        </CampoSelect>
      </div>

      <CampoArea
        id="produto-descricao"
        rotulo="Descrição"
        rows={4}
        value={valores.descricao}
        onChange={(evento) => atualizar("descricao", evento.target.value)}
        placeholder="Conte para a cliente o que torna esta peça especial…"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoTexto
          id="produto-composicao"
          rotulo="Composição"
          value={valores.composicao}
          onChange={(evento) => atualizar("composicao", evento.target.value)}
          placeholder="Ex.: 100% viscose"
        />
        <CampoTexto
          id="produto-cuidados"
          rotulo="Cuidados"
          value={valores.cuidados}
          onChange={(evento) => atualizar("cuidados", evento.target.value)}
          placeholder="Ex.: Lavar à mão, secar à sombra"
        />
      </div>

      {/* ----------------------------------------------------
          Cores — opções reais das variações da loja.
          Na edição, as cores atuais da peça já vêm marcadas.
          ---------------------------------------------------- */}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Cores</legend>
        <p className="mt-1 text-xs leading-5 text-ink-soft">
          Escolha uma ou mais cores da peça. As opções vêm das
          variações reais da loja — a gravação chega com a integração.
          {modo === "edicao" &&
            " As cores atuais da peça já vêm marcadas."}
        </p>
        {coresDisponiveis.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {coresDisponiveis.map((cor) => {
              const marcada = coresSelecionadas.includes(cor.nome);
              return (
                <button
                  key={cor.nome}
                  type="button"
                  aria-pressed={marcada}
                  aria-label={`${marcada ? "Desmarcar" : "Marcar"} cor ${cor.nome}`}
                  onClick={() => alternarCor(cor.nome)}
                  className={
                    marcada
                      ? "inline-flex items-center gap-2 rounded-full border border-gold bg-champagne px-4 py-2 text-sm font-medium text-gold-ink transition hover:border-gold-deep"
                      : "inline-flex items-center gap-2 rounded-full border border-sand bg-ivory px-4 py-2 text-sm text-ink-soft transition hover:border-gold hover:text-ink"
                  }
                >
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: cor.hex }}
                  />
                  {cor.nome}
                  {marcada && <IconeCheck className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2.5 text-sm text-ink-soft">
            Ainda não existe nenhuma cor nas variações da loja — quando
            houver, as opções aparecem aqui.
          </p>
        )}
      </fieldset>

      {/* ----------------------------------------------------
          Tamanhos — opções reais das variações da loja.
          Na edição, os tamanhos atuais já vêm marcados.
          ---------------------------------------------------- */}
      <fieldset>
        <legend className="text-sm font-medium text-ink">Tamanhos</legend>
        <p className="mt-1 text-xs leading-5 text-ink-soft">
          Escolha um ou mais tamanhos da peça — cada tamanho com cada
          cor vira uma variação quando a gravação for conectada.
          {modo === "edicao" &&
            " Os tamanhos atuais da peça já vêm marcados."}
        </p>
        {tamanhosDisponiveis.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {tamanhosDisponiveis.map((tamanho) => {
              const marcado = tamanhosSelecionados.includes(tamanho);
              return (
                <button
                  key={tamanho}
                  type="button"
                  aria-pressed={marcado}
                  aria-label={`${marcado ? "Desmarcar" : "Marcar"} tamanho ${tamanho}`}
                  onClick={() => alternarTamanho(tamanho)}
                  className={
                    marcado
                      ? "inline-flex items-center gap-2 rounded-full border border-gold bg-champagne px-4 py-2 text-sm font-medium text-gold-ink transition hover:border-gold-deep"
                      : "inline-flex items-center gap-2 rounded-full border border-sand bg-ivory px-4 py-2 text-sm text-ink-soft transition hover:border-gold hover:text-ink"
                  }
                >
                  {tamanho}
                  {marcado && <IconeCheck className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2.5 text-sm text-ink-soft">
            Ainda não existe nenhum tamanho nas variações da loja —
            quando houver, as opções aparecem aqui.
          </p>
        )}
      </fieldset>

      <CampoCheckbox
        id="produto-destaque"
        rotulo="Destaque na página inicial"
        dica="Peças em destaque aparecem na seção “Novidades” da home."
        checked={valores.destaque}
        onChange={(evento) => atualizar("destaque", evento.target.checked)}
      />

      {/* Fotos: apenas a área preparada — o upload chega com o Storage (Etapa 10). */}
      <div>
        <p className="mb-1.5 block text-sm font-medium text-ink">Fotos da peça</p>
        <div className="rounded-xl border border-dashed border-sand bg-ivory px-4 py-8 text-center text-sm leading-6 text-ink-soft">
          O envio de fotos chega com o armazenamento (Storage) na Etapa 10.
          Hoje as páginas da loja mostram a foto demonstrativa.
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-sand pt-5">
        <Botao type="submit" variante="primario">
          {modo === "novo" ? "Conferir cadastro" : "Conferir alterações"}
        </Botao>
        <BotaoLink href="/admin/produtos" variante="suave">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  );
}
