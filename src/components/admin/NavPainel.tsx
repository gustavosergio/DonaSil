"use client";

// ============================================================
// DONA SIL — PAINEL — NAVEGAÇÃO LATERAL + CABEÇALHO
// ============================================================
// * Desktop: menu lateral fixo (Visão geral, Produtos, Categorias,
//   Cores e variações, Pedidos, Configurações) + barra superior
//   com o nome da seção atual e espaço para a conta.
// * Mobile: barra superior com botão de abrir/fechar do menu,
//   que desliza por cima do conteúdo.
// * Conta: sessão de administradora com botão Sair (o acesso é
//   verificado no servidor; ver src/proxy.ts e /admin/login).
// * Na tela de entrada (/admin/login) o menu inteiro se esconde.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import AlternarTema from "@/components/AlternarTema";
import BotaoSair from "./BotaoSair";
import {
  IconeCasa,
  IconeEngrenagem,
  IconeFechar,
  IconeMarcador,
  IconeMenu,
  IconeSacola,
  IconeTag,
} from "./Icones";

type Secao = {
  href: "/admin" | "/admin/produtos" | "/admin/categorias" | "/admin/cores" | "/admin/pedidos" | "/admin/configuracoes";
  titulo: string;
  icone: ComponentType<{ className?: string }>;
};

const SECOES: Secao[] = [
  { href: "/admin", titulo: "Visão geral", icone: IconeCasa },
  { href: "/admin/produtos", titulo: "Produtos", icone: IconeTag },
  { href: "/admin/categorias", titulo: "Categorias", icone: IconeMarcador },
  { href: "/admin/pedidos", titulo: "Pedidos", icone: IconeSacola },
  { href: "/admin/configuracoes", titulo: "Configurações", icone: IconeEngrenagem },
];

/** Nome da seção exibido na barra superior, a partir da rota atual. */
function tituloDaRota(caminho: string): string {
  if (caminho.startsWith("/admin/produtos/novo")) return "Produtos — cadastrar";
  if (caminho.startsWith("/admin/produtos/")) return "Produtos — editar";
  const secao = SECOES.find(
    (s) => caminho === s.href || caminho.startsWith(`${s.href}/`),
  );
  return secao?.titulo ?? "Painel";
}

function ItemMenu({ secao, ativo, aoNavegar }: { secao: Secao; ativo: boolean; aoNavegar?: () => void }) {
  const Icone = secao.icone;
  return (
    <Link
      href={secao.href}
      onClick={aoNavegar}
      aria-current={ativo ? "page" : undefined}
      className={
        ativo
          ? "flex items-center gap-3 rounded-xl bg-champagne px-4 py-2.5 text-sm font-semibold text-gold-ink"
          : "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-champagne/60 hover:text-ink"
      }
    >
      <Icone className="h-5 w-5 shrink-0" />
      {secao.titulo}
    </Link>
  );
}

/** Lista de seções reaproveitada no menu desktop e no mobile. */
function ListaSecoes({ caminho, aoNavegar }: { caminho: string; aoNavegar?: () => void }) {
  return (
    <ul className="space-y-1">
      {SECOES.map((secao) => (
        <li key={secao.href}>
          <ItemMenu
            secao={secao}
            ativo={caminho === secao.href || caminho.startsWith(`${secao.href}/`)}
            aoNavegar={aoNavegar}
          />
        </li>
      ))}
    </ul>
  );
}

/** Rodapé da conta — sessão de administradora + sair. */
function RodapeConta() {
  return (
    <div className="border-t border-sand px-5 py-4">
      <p className="text-xs font-semibold text-ink">Conta</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">
        Sessão de administradora ativa. Saia do painel quando
        terminar de usá-lo em um computador compartilhado.
      </p>
      <div className="mt-2.5">
        <BotaoSair />
      </div>
    </div>
  );
}

export default function NavPainel() {
  const caminho = usePathname() ?? "/admin";
  const [aberto, setAberto] = useState(false);
  const titulo = tituloDaRota(caminho);

  // Na tela de entrada o menu some por completo (sem sessão não
  // há seções para navegar — o portão cuida do resto).
  if (caminho === "/admin/login") return null;

  return (
    <>
      {/* Menu lateral — telas médias e grandes */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sand bg-ivory md:flex">
        <div className="flex h-16 items-center border-b border-sand px-6">
          <Link href="/admin" className="font-display text-xl font-semibold text-gold-ink">
            Dona Sil
          </Link>
          <span className="ml-2 rounded-full bg-champagne px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-ink">
            Painel
          </span>
        </div>
        <nav aria-label="Seções do painel" className="flex-1 overflow-y-auto px-3 py-4">
          <ListaSecoes caminho={caminho} />
        </nav>
        <RodapeConta />
      </aside>

      {/* Barra superior */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-sand bg-ivory/95 px-4 backdrop-blur sm:px-6 md:left-64">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-champagne md:hidden"
            aria-expanded={aberto}
            aria-controls="menu-painel"
            aria-label={aberto ? "Fechar menu do painel" : "Abrir menu do painel"}
            onClick={() => setAberto((valor) => !valor)}
          >
            {aberto ? <IconeFechar className="h-6 w-6" /> : <IconeMenu className="h-6 w-6" />}
          </button>
          <span className="truncate font-display text-lg font-semibold text-gold-ink md:hidden">
            Dona Sil · Painel
          </span>
          <p className="hidden truncate text-sm font-semibold text-ink md:block">{titulo}</p>
        </div>
        <AlternarTema />
        <span className="hidden shrink-0 rounded-full border border-sand px-3 py-1.5 text-xs font-medium text-ink-soft md:inline-block">
          Sessão de administradora
        </span>
        <div className="hidden md:block">
          <BotaoSair />
        </div>
      </header>

      {/* Menu lateral — telas pequenas (desliza por cima) */}
      {aberto && (
        <>
          <button
            type="button"
            aria-label="Fechar menu do painel"
            className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            onClick={() => setAberto(false)}
          />
          <aside
            id="menu-painel"
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sand bg-ivory md:hidden"
          >
            <div className="flex h-16 items-center justify-between border-b border-sand px-5">
              <span className="font-display text-xl font-semibold text-gold-ink">Dona Sil</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-champagne"
                aria-label="Fechar menu do painel"
                onClick={() => setAberto(false)}
              >
                <IconeFechar className="h-6 w-6" />
              </button>
            </div>
            <nav aria-label="Seções do painel" className="flex-1 overflow-y-auto px-3 py-4">
              <ListaSecoes caminho={caminho} aoNavegar={() => setAberto(false)} />
            </nav>
            <RodapeConta />
          </aside>
        </>
      )}
    </>
  );
}
