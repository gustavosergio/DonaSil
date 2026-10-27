"use client";

// Cadastro em rascunho com tamanhos e estoque. A cor é informada
// junto ao envio das fotos, sem escolher tons ou códigos.

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { CategoriaResumo, CorPeca } from "@/lib/catalogo";
import { Aviso } from "./Aviso";
import { Botao, BotaoLink } from "./Botao";
import { CampoArea, CampoCheckbox, CampoSelect, CampoTexto } from "./Campo";
import { IconeCheck, IconeFechar, IconeMais } from "./Icones";

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
  /** Status da peça — gravação real na edição (o cadastro nasce ativo). */
  status: "ativo" | "rascunho";
  destaque: boolean;
};

/** Tamanho escolhido no cadastro + estoque inicial. */
type TamanhoEscolhido = { tamanho: string; quantidade: number };

type ErrosFormulario = {
  nome?: string;
  preco?: string;
  categoriaSlug?: string;
  cores?: string;
  tamanhos?: string;
};

export function FormularioProduto({
  modo,
  slug,
  categorias,
  tamanhosDisponiveis,
  valoresIniciais,
  tamanhosAtuais = [],
}: {
  modo: "novo" | "edicao";
  /** Endereço da peça no banco — alvo do PATCH (só na edição). */
  slug?: string;
  categorias: CategoriaResumo[];
  coresDisponiveis: CorPeca[];
  tamanhosDisponiveis: string[];
  valoresIniciais?: ValoresProduto;
  /** Cores reais que a peça tem hoje (modo edição — somente leitura). */
  coresAtuais?: CorPeca[];
  /** Tamanhos reais que a peça tem hoje (modo edição — somente leitura). */
  tamanhosAtuais?: string[];
}) {
  const router = useRouter();
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
  const [erros, setErros] = useState<ErrosFormulario>({});
  const [enviando, setEnviando] = useState(false);
  /** Só fica true DEPOIS que o banco confirma a gravação. */
  const [salvo, setSalvo] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<{ mensagem: string; semSessao: boolean } | null>(
    null,
  );

  // Estado exclusivo do modo "novo" (cadastro real).
  const [tamanhos, setTamanhos] = useState<TamanhoEscolhido[]>([]);
  const [novoTamanho, setNovoTamanho] = useState("");
  const [erroTamanhos, setErroTamanhos] = useState<string | null>(null);

  function atualizar<K extends keyof ValoresProduto>(campo: K, valor: ValoresProduto[K]) {
    // Qualquer edição depois de salvar apaga a confirmação
    // antiga — o aviso de sucesso nunca fica velho na tela.
    setSalvo(false);
    setValores((atuais) => ({ ...atuais, [campo]: valor }));
  }

  // ----------------------------------------------------------
  // Modo NOVO — cores e tamanhos com estoque (cadastro real)
  // ----------------------------------------------------------

  function jaTemTamanho(tamanho: string): boolean {
    const alvo = tamanho.trim().toLowerCase();
    return tamanhos.some((item) => item.tamanho.trim().toLowerCase() === alvo);
  }

  function alternarTamanhoSugestao(tamanho: string) {
    setErroTamanhos(null);
    setErroEnvio(null);
    setTamanhos((atuais) =>
      jaTemTamanho(tamanho)
        ? atuais.filter((item) => item.tamanho !== tamanho)
        : [...atuais, { tamanho, quantidade: 0 }],
    );
  }

  function adicionarTamanhoPersonalizado() {
    const tamanho = novoTamanho.trim();
    if (!tamanho) {
      setErroTamanhos("Escreva o tamanho (ex.: 38).");
      return;
    }
    if (jaTemTamanho(tamanho)) {
      setErroTamanhos("Este tamanho já está na lista.");
      return;
    }
    setErroTamanhos(null);
    setErroEnvio(null);
    setTamanhos((atuais) => [...atuais, { tamanho, quantidade: 0 }]);
    setNovoTamanho("");
  }

  function removerTamanho(tamanho: string) {
    setErroTamanhos(null);
    setTamanhos((atuais) => atuais.filter((item) => item.tamanho !== tamanho));
  }

  /** Estoque do tamanho — número inteiro entre 0 e 9999. */
  function definirQuantidade(tamanho: string, texto: string) {
    const numero = Number.parseInt(texto, 10);
    const quantidade =
      Number.isFinite(numero) && numero >= 0 ? Math.min(numero, 9999) : 0;
    setTamanhos((atuais) =>
      atuais.map((item) =>
        item.tamanho === tamanho ? { ...item, quantidade } : item,
      ),
    );
  }

  // ----------------------------------------------------------
  // Envio
  // ----------------------------------------------------------

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    // Modo EDIÇÃO: validação + GRAVAÇÃO REAL
    // (PATCH /api/admin/produtos/[slug]).
    if (modo === "edicao") {
      const novosErros: ErrosFormulario = {};
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
      setSalvo(false);
      setErroEnvio(null);
      if (Object.keys(novosErros).length > 0) return;

      if (!slug) {
        setErroEnvio({
          mensagem:
            "Não foi possível identificar a peça — recarregue a página e tente de novo.",
          semSessao: false,
        });
        return;
      }

      // Gravação: o servidor valida a sessão httpOnly, confirma o
      // admin NO BANCO e grava por id (o alvo é o slug da URL).
      // Sucesso só quando o banco devolve a linha alterada.
      setEnviando(true);
      try {
        const resposta = await fetch(
          `/api/admin/produtos/${encodeURIComponent(slug)}` as Route<
            "/api/admin/produtos/[slug]"
          >,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: valores.nome.trim(),
              preco,
              categoriaSlug: valores.categoriaSlug,
              descricao: valores.descricao.trim(),
              composicao: valores.composicao.trim(),
              cuidados: valores.cuidados.trim(),
              ativo: valores.status === "ativo",
              destaque: valores.destaque,
            }),
          },
        );

        let dados: { ok?: boolean; mensagem?: string } = {};
        try {
          dados = (await resposta.json()) as typeof dados;
        } catch {
          // resposta sem corpo legível — segue com a mensagem padrão
        }

        if (!resposta.ok || !dados.ok) {
          // Erro: nada é apagado — o formulário mantém o que foi preenchido.
          setErroEnvio({
            mensagem:
              dados.mensagem ?? "Não foi possível salvar as alterações agora. Tente de novo.",
            semSessao: resposta.status === 401,
          });
          return;
        }

        // Gravado de verdade: confirma e atualiza as seções de
        // servidor (resumo, selos, estoque, lista) sem perder o
        // que está preenchido no formulário.
        setSalvo(true);
        router.refresh();
      } catch {
        setErroEnvio({
          mensagem:
            "Não foi possível falar com o servidor agora. Verifique sua conexão e tente de novo.",
          semSessao: false,
        });
      } finally {
        setEnviando(false);
      }
      return;
    }

    // Modo NOVO: validação completa antes de enviar.
    const novosErros: ErrosFormulario = {};
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

    if (tamanhos.length === 0) {
      novosErros.tamanhos = "Escolha ao menos um tamanho com estoque.";
    }
    setErros(novosErros);
    setErroEnvio(null);
    if (Object.keys(novosErros).length > 0) return;

    // Cadastro real: o servidor valida a sessão httpOnly e grava
    // produto + cores + variações no Supabase.
    setEnviando(true);
    try {
      const resposta = await fetch("/api/admin/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: valores.nome.trim(),
          preco,
          categoriaSlug: valores.categoriaSlug,
          descricao: valores.descricao.trim(),
          composicao: valores.composicao.trim(),
          cuidados: valores.cuidados.trim(),
          destaque: valores.destaque,
          cores: [{ nome: "Única", hex: "#808080" }],
          tamanhos: tamanhos.map((item) => ({
            tamanho: item.tamanho,
            quantidade: item.quantidade,
          })),
        }),
      });

      let dados: { ok?: boolean; slug?: string; mensagem?: string } = {};
      try {
        dados = (await resposta.json()) as typeof dados;
      } catch {
        // resposta sem corpo legível — segue com a mensagem padrão
      }

      if (!resposta.ok || !dados.ok) {
        setErroEnvio({
          mensagem:
            dados.mensagem ?? "Não foi possível salvar a peça agora. Tente de novo.",
          semSessao: resposta.status === 401,
        });
        return;
      }

      // Cadastrada: abre a peça no painel (estoque real dela).
      router.push(
        `/admin/produtos/${dados.slug}` as Route<"/admin/produtos/[slug]">,
      );
    } catch {
      setErroEnvio({
        mensagem:
          "Não foi possível falar com o servidor agora. Verifique sua conexão e tente de novo.",
        semSessao: false,
      });
    } finally {
      setEnviando(false);
    }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-5">
      {modo === "edicao" ? (
        <Aviso titulo="Ao salvar, as alterações são gravadas no banco">
          Nome, preço, categoria, descrição, composição, cuidados, status e
          destaque são gravados de verdade ao clicar em “Salvar alterações”.
          Ajuste as quantidades na seção “Estoque por variação”, acima.
          Informe a cor junto ao envio das fotos. O endereço
          da peça permanece o mesmo para preservar seus links e fotos.
        </Aviso>
      ) : (
        <Aviso titulo="Primeiro prepare o anúncio, depois publique">
          O produto será salvo como rascunho. Na próxima tela, adicione as fotos
          reais, confira a descrição e altere o status para Ativo quando estiver
          pronto. Assim o catálogo não exibe anúncios incompletos.
        </Aviso>
      )}

      {erroEnvio && (
        <Aviso tonalidade="atencao" titulo="Não foi possível salvar">
          {erroEnvio.mensagem}{" "}
          {erroEnvio.semSessao && (
            <Link
              href="/admin/login"
              className="font-medium text-gold-ink hover:underline"
            >
              Entrar de novo
            </Link>
          )}
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
          onChange={(evento) => {
            const categoria = evento.target.value;
            atualizar("categoriaSlug", categoria);
            if (categoria === "desapego" && modo === "novo") {
              setTamanhos(atuais => atuais.length ? atuais : [{ tamanho: "Único", quantidade: 1 }]);
            }
          }}
          erro={erros.categoriaSlug}
        >
          <option value="">Escolha uma categoria…</option>
          {categorias.map((categoria) => (
            <option key={categoria.slug} value={categoria.slug}>
              {categoria.nome}
            </option>
          ))}
        </CampoSelect>
        {/* Status: apenas na EDIÇÃO — gravado pelo PATCH (rascunho
            some da loja pública). O cadastro novo nasce ATIVO. */}
        {modo === "edicao" && (
          <CampoSelect
            id="produto-status"
            rotulo="Status"
            value={valores.status}
            onChange={(evento) =>
              atualizar("status", evento.target.value as ValoresProduto["status"])
            }
            dica="Rascunho = invisível na loja pública. A escolha é gravada ao salvar."
          >
            <option value="ativo">Ativo (visível na loja)</option>
            <option value="rascunho">Rascunho (em preparação)</option>
          </CampoSelect>
        )}
      </div>

      <CampoArea
        id="produto-descricao"
        rotulo="Descrição"
        rows={4}
        value={valores.descricao}
        onChange={(evento) => atualizar("descricao", evento.target.value)}
        placeholder={valores.categoriaSlug === "desapego" ? "Informe estado de conservação, marcas de uso, medidas, voltagem (quando houver), acessórios incluídos e condições de retirada…" : "Conte para a cliente o que torna esta peça especial…"}
      />
      {valores.categoriaSlug === "desapego" && <p className="rounded-xl bg-champagne p-4 text-sm leading-7 text-ink-soft">Este anúncio aparece somente no Desapego. Preencha os detalhes de uso e medidas na descrição. Para um objeto único, use tamanho “Único” e estoque 1. A compra e o transporte são combinados pelo WhatsApp. Após salvar, adicione as fotos reais na edição do produto.</p>}

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

      {modo === "edicao" ? (
        /* Tamanhos da EDIÇÃO — SOMENTE LEITURA: os tamanhos reais
           da peça; o estoque de cada variação está na tabela
           "Estoque por variação" acima. */
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Tamanhos (somente leitura)
          </legend>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            Estes são os tamanhos reais da peça — o estoque de cada variação
            está na tabela acima. A edição de tamanhos e estoque chega com a
            migração das variações.
          </p>
          {tamanhosAtuais.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {tamanhosAtuais.map((tamanho) => (
                <span
                  key={tamanho}
                  className="inline-flex items-center rounded-full border border-gold bg-champagne px-4 py-2 text-sm font-medium text-gold-ink"
                >
                  {tamanho}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2.5 text-sm text-ink-soft">
              Esta peça não tem tamanhos cadastrados nas variações.
            </p>
          )}
        </fieldset>
      ) : (
        /* Tamanhos do CADASTRO — sugestões + tamanho livre com estoque. */
        <fieldset>
          <legend className="text-sm font-medium text-ink">
            Tamanhos e estoque
          </legend>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            Escolha os tamanhos e o estoque inicial de cada um. A quantidade
            é o estoque inicial da peça — cada tamanho vira uma
            variação no estoque da loja.
          </p>
          {tamanhosDisponiveis.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {tamanhosDisponiveis.map((tamanho) => {
                const marcado = jaTemTamanho(tamanho);
                return (
                  <button
                    key={tamanho}
                    type="button"
                    aria-pressed={marcado}
                    aria-label={`${marcado ? "Remover" : "Adicionar"} tamanho ${tamanho}`}
                    onClick={() => alternarTamanhoSugestao(tamanho)}
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
          )}

          <div className="mt-3 flex flex-wrap items-end gap-3">
            <CampoTexto
              id="novo-tamanho"
              rotulo="Novo tamanho"
              className="w-44"
              value={novoTamanho}
              onChange={(evento) => setNovoTamanho(evento.target.value)}
              placeholder="Ex.: 38"
            />
            <Botao
              type="button"
              variante="secundario"
              onClick={adicionarTamanhoPersonalizado}
            >
              <IconeMais className="h-4 w-4" />
              Adicionar tamanho
            </Botao>
          </div>
          {erroTamanhos && (
            <p role="alert" className="mt-1.5 text-xs text-[#a04b32]">
              {erroTamanhos}
            </p>
          )}
          {erros.tamanhos && (
            <p role="alert" className="mt-1.5 text-xs text-[#a04b32]">
              {erros.tamanhos}
            </p>
          )}

          {tamanhos.length > 0 && (
            <ul className="mt-3 space-y-2">
              {tamanhos.map((item, indice) => (
                <li
                  key={item.tamanho}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-sand bg-ivory px-3.5 py-2.5"
                >
                  <span className="flex-1 text-sm font-medium text-ink">
                    {item.tamanho}
                  </span>
                  <label
                    htmlFor={`estoque-${indice}`}
                    className="text-xs text-ink-soft"
                  >
                    Estoque
                  </label>
                  <input
                    id={`estoque-${indice}`}
                    type="number"
                    min={0}
                    max={9999}
                    step={1}
                    inputMode="numeric"
                    value={item.quantidade}
                    onChange={(evento) =>
                      definirQuantidade(item.tamanho, evento.target.value)
                    }
                    aria-label={`Estoque do tamanho ${item.tamanho}`}
                    className="w-24 rounded-xl border border-sand bg-ivory px-3 py-1.5 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removerTamanho(item.tamanho)}
                    aria-label={`Remover tamanho ${item.tamanho}`}
                    className="rounded-full p-1.5 text-ink-soft transition hover:bg-sand hover:text-ink"
                  >
                    <IconeFechar className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <CampoCheckbox
        id="produto-destaque"
        rotulo="Destaque na página inicial"
        dica="Peças em destaque aparecem na seção “Novidades” da home."
        checked={valores.destaque}
        onChange={(evento) => atualizar("destaque", evento.target.checked)}
      />

      {/* Fotos: já existem — o upload, a visualização e a exclusão
          acontecem na seção "Fotos da peça" desta mesma página. */}
      <div>
        <p className="mb-1.5 block text-sm font-medium text-ink">Fotos da peça</p>
        <div className="rounded-xl border border-dashed border-sand bg-ivory px-4 py-8 text-center text-sm leading-6 text-ink-soft">
          As fotos são enviadas, vistas e excluídas na seção “Fotos da peça”
          desta mesma página — nada aqui é gravado pelo formulário.
        </div>
      </div>

      {/* Confirmação REAL da gravação (modo edição): AQUI, colada
          nos botões, para o feedback aparecer onde o olho está
          após o clique. Só aparece DEPOIS que o banco confirma. */}
      {modo === "edicao" && salvo && (
        <Aviso tonalidade="info" titulo="Alterações salvas">
          As alterações foram gravadas no banco.{" "}
          {valores.status === "rascunho"
            ? "A peça está em rascunho: desapareceu da loja pública e continua aberta aqui no painel."
            : "A peça está ativa: visível na loja pública."}
        </Aviso>
      )}

      <div className="flex flex-wrap gap-3 border-t border-sand pt-5">
        <Botao type="submit" variante="primario" disabled={enviando}>
          {enviando
            ? "Salvando…"
            : modo === "novo"
              ? "Salvar produto"
              : "Salvar alterações"}
        </Botao>
        <BotaoLink href="/admin/produtos" variante="suave">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  );
}
