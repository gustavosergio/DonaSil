"use client";

// ============================================================
// DONA SIL — PAINEL — FOTOS DA PEÇA (por cor)
// ============================================================
// Envia (POST /api/admin/fotos), lista e exclui (DELETE) as
// fotos de cada cor da peça. Os cookies httpOnly da sessão
// acompanham o fetch automaticamente — nenhum token passa pelo
// JavaScript da página.
//
// A lista vem do servidor (produto_cores com produto_fotos
// embutidos, ver src/lib/painel-crud.ts); depois de cada
// operação bem-sucedida o componente chama router.refresh() e a
// página revalida os dados reais do banco.
// ============================================================

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Aviso } from "./Aviso";
import { Botao } from "./Botao";
import { IconeFechar, IconeMais } from "./Icones";
import {
  LIMITE_FOTO_BYTES,
  ROTULO_FORMATOS_FOTO,
  urlPublicaFoto,
  type CorPainel,
} from "@/lib/fotos";

/** Mensagem de erro da rota, com fallback honesto. */
async function mensagemDaResposta(resposta: Response): Promise<string> {
  const dados = (await resposta.json().catch(() => null)) as {
    mensagem?: unknown;
  } | null;
  return typeof dados?.mensagem === "string" && dados.mensagem
    ? dados.mensagem
    : "Não foi possível concluir agora. Tente de novo em instantes.";
}

export function FotosProduto({ cores }: { cores: CorPainel[] }) {
  // Sem cores na tabela nova: peças de demonstração e cadastros
  // antigos não têm — o aviso explica em vez de esconder a seção.
  if (cores.length === 0) {
    return (
      <Aviso tonalidade="info" titulo="Esta peça não tem cores do cadastro real">
        As fotos por cor ficam nas cores criadas pelo cadastro real do painel.
        Peças de demonstração e cadastros antigos não têm essas cores — para
        usar fotos por cor, cadastre a peça de novo pelo botão “Nova peça”.
      </Aviso>
    );
  }

  return (
    <div className="space-y-6">
      {cores.map((cor) => (
        <CorFotos key={cor.id} cor={cor} />
      ))}
    </div>
  );
}

function CorFotos({ cor }: { cor: CorPainel }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa a escolha na hora: o mesmo arquivo pode ser enviado
    // de novo depois de um erro, sem precisar trocar de arquivo.
    evento.target.value = "";
    if (!arquivo || ocupado) return;

    setErro(null);
    setAviso(null);

    // Pré-conferência no navegador (o servidor refaz tudo).
    if (arquivo.size === 0) {
      setErro("O arquivo está vazio.");
      return;
    }
    if (arquivo.size > LIMITE_FOTO_BYTES) {
      setErro("A foto passa de 5 MB — escolha um arquivo menor.");
      return;
    }

    setOcupado(true);
    try {
      const dados = new FormData();
      dados.append("corId", cor.id);
      dados.append("arquivo", arquivo);

      const resposta = await fetch("/api/admin/fotos", {
        method: "POST",
        body: dados,
      });
      if (resposta.ok) {
        setAviso("Foto enviada.");
        router.refresh();
      } else {
        setErro(await mensagemDaResposta(resposta));
      }
    } catch {
      setErro(
        "Não foi possível conectar ao servidor. Verifique a internet e tente de novo.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function aoExcluir(fotoId: string) {
    if (ocupado) return;
    const confirmado = window.confirm(
      "Excluir esta foto? A exclusão não pode ser desfeita.",
    );
    if (!confirmado) return;

    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const resposta = await fetch("/api/admin/fotos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fotoId }),
      });
      if (resposta.ok) {
        setAviso("Foto excluída.");
        router.refresh();
      } else {
        setErro(await mensagemDaResposta(resposta));
      }
    } catch {
      setErro(
        "Não foi possível conectar ao servidor. Verifique a internet e tente de novo.",
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sand bg-ivory p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-5 w-5 rounded-full border border-black/10"
            style={{ backgroundColor: cor.hex }}
          />
          <p className="font-medium text-ink">{cor.nome}</p>
        </div>
        <p className="text-xs text-ink-soft">
          {cor.fotos.length === 1 ? "1 foto" : `${cor.fotos.length} fotos`}
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[#e7c8bc] bg-[#f9ece6] px-4 py-2.5 text-sm leading-6 text-[#a04b32]"
        >
          {erro}
        </p>
      )}
      {aviso && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#bfd9c4] bg-[#eef5ef] px-4 py-2.5 text-sm leading-6 text-[#2f6b45]"
        >
          {aviso}
        </p>
      )}

      {cor.fotos.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Nenhuma foto nesta cor ainda.
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-3">
          {cor.fotos.map((foto, indice) => (
            <li key={foto.id} className="relative">
              {/* Miniatura do painel: <img> simples — o bucket é
                  externo e o next/image exigiria remotePatterns no
                  next.config (fora do escopo desta etapa). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlPublicaFoto(foto.caminho)}
                alt={`Foto ${indice + 1} da cor ${cor.nome}`}
                loading="lazy"
                className="h-24 w-24 rounded-xl border border-sand bg-champagne object-cover"
              />
              <button
                type="button"
                onClick={() => aoExcluir(foto.id)}
                disabled={ocupado}
                title="Excluir esta foto"
                aria-label={`Excluir a foto ${indice + 1} da cor ${cor.nome}`}
                className="absolute -right-2 -top-2 rounded-full border border-sand bg-ivory p-1 text-ink-soft transition hover:border-gold hover:text-gold-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconeFechar className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={aoEscolher}
          disabled={ocupado}
          aria-label={`Enviar foto para a cor ${cor.nome}`}
        />
        <Botao
          variante="secundario"
          tamanho="compacto"
          disabled={ocupado}
          onClick={() => entrada.current?.click()}
        >
          <IconeMais className="h-4 w-4" />
          {ocupado ? "Aguarde…" : "Enviar foto"}
        </Botao>
        <p className="mt-2 text-xs text-ink-soft">{ROTULO_FORMATOS_FOTO}.</p>
      </div>
    </div>
  );
}
