"use client";

// ============================================================
// DONA SIL — PAINEL — CATEGORIAS (LISTA + FORMULÁRIO VISUAL)
// ============================================================
// Um único bloco interativo:
//   * tabela com as categorias reais (nome, slug, nº de peças);
//   * botão "Editar" de cada linha preenche o formulário abaixo;
//   * "Nova categoria" limpa o formulário para começar de novo.
// Salvar = apenas conferência local: nada é gravado no banco.
//
// Obs.: o modelo atual de categorias tem nome, slug e ordem —
// sem descrição nem status, por isso esses campos não existem
// aqui (nada de campos inventados).
// ============================================================

import { useState, type FormEvent } from "react";
import { Aviso } from "./Aviso";
import { Botao } from "./Botao";
import { CampoTexto } from "./Campo";
import { EstadoVazio } from "./EstadoVazio";
import { IconeLapis, IconeMais } from "./Icones";
import { Tabela, Td, Th } from "./Tabela";

export type CategoriaComContagem = {
  nome: string;
  slug: string;
  produtos: number;
};

/** Gera um slug simples a partir do nome (só visual, editável). */
function slugDe(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PainelCategorias({ categorias }: { categorias: CategoriaComContagem[] }) {
  const [editando, setEditando] = useState<CategoriaComContagem | null>(null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [conferido, setConferido] = useState(false);

  function comecarNova() {
    setEditando(null);
    setNome("");
    setSlug("");
    setErro(null);
    setConferido(false);
  }

  function comecarEdicao(categoria: CategoriaComContagem) {
    setEditando(categoria);
    setNome(categoria.nome);
    setSlug(categoria.slug);
    setErro(null);
    setConferido(false);
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setConferido(false);

    if (nome.trim().length < 2) {
      setErro("Informe o nome da categoria (ao menos 2 letras).");
      return;
    }
    if (slug.trim() === "") {
      setErro("Informe o endereço (slug) da categoria.");
      return;
    }
    setErro(null);
    setConferido(true);
  }

  return (
    <div className="space-y-8">
      {/* Lista das categorias reais */}
      {categorias.length > 0 ? (
        <Tabela>
          <thead>
            <tr>
              <Th>Categoria</Th>
              <Th>Endereço (slug)</Th>
              <Th className="text-right">Peças ativas</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => (
              <tr key={categoria.slug}>
                <Td className="font-medium">{categoria.nome}</Td>
                <Td className="text-ink-soft">{categoria.slug}</Td>
                <Td className="text-right">{categoria.produtos}</Td>
                <Td>
                  <div className="flex justify-end">
                    <Botao
                      tamanho="compacto"
                      variante="suave"
                      onClick={() => comecarEdicao(categoria)}
                      aria-label={`Editar categoria ${categoria.nome}`}
                    >
                      <IconeLapis className="h-3.5 w-3.5" />
                      Editar
                    </Botao>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      ) : (
        <EstadoVazio
          titulo="Nenhuma categoria cadastrada"
          descricao="Quando a loja cadastrar categorias no banco, elas aparecem aqui automaticamente."
        />
      )}

      {/* Formulário (novo ou editando uma existente) */}
      <section
        aria-labelledby="titulo-formulario-categoria"
        className="rounded-2xl border border-sand bg-ivory p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="titulo-formulario-categoria" className="font-display text-xl font-semibold text-ink">
            {editando ? `Editando: ${editando.nome}` : "Nova categoria"}
          </h2>
          <Botao
            tamanho="compacto"
            variante="secundario"
            onClick={comecarNova}
            disabled={editando === null && nome === "" && slug === ""}
          >
            <IconeMais className="h-3.5 w-3.5" />
            Começar outra
          </Botao>
        </div>

        <form onSubmit={aoEnviar} noValidate className="space-y-4">
          <Aviso>
            A gravação no banco será habilitada com a integração do painel.
            Por enquanto o formulário apenas confere os campos — nada é salvo.
          </Aviso>

          {conferido && (
            <Aviso tonalidade="info" titulo="Campos conferidos">
              Tudo certo! O salvamento real chega com a integração — nada foi
              gravado no banco.
            </Aviso>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <CampoTexto
              id="categoria-nome"
              rotulo="Nome"
              required
              value={nome}
              onChange={(evento) => {
                setNome(evento.target.value);
                // Preenche o slug automaticamente enquanto ele não for editado à mão.
                if (!editando || slug === slugDe(editando.nome)) {
                  setSlug(slugDe(evento.target.value));
                }
              }}
              erro={erro?.includes("nome") ? erro : undefined}
              placeholder="Ex.: Vestidos"
            />
            <CampoTexto
              id="categoria-slug"
              rotulo="Endereço (slug)"
              required
              value={slug}
              onChange={(evento) => setSlug(evento.target.value)}
              dica="Aparece no link do catálogo: /catalogo?categoria=…"
              erro={erro?.includes("slug") ? erro : undefined}
              placeholder="Ex.: vestidos"
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-sand pt-4">
            <Botao type="submit">
              {editando ? "Conferir alterações" : "Conferir categoria"}
            </Botao>
            <Botao variante="suave" onClick={comecarNova}>
              Cancelar
            </Botao>
          </div>
        </form>
      </section>
    </div>
  );
}
