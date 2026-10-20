"use client";

// ============================================================
// DONA SIL — ETAPA 5b — CONTEXTO DA SACOLA
// ============================================================
// Estado da sacola no navegador (localStorage), sem login —
// combina com o desenho do banco (compradora anônima).
//
// Hidratação: o servidor e a PRIMEIRA renderização do cliente
// sempre começam com sacola vazia e `carregado = false`. O
// localStorage só é lido em useEffect (depois da primeira
// renderização) — conteúdo inicial idêntico nos dois lados,
// sem erro de hidratação no Next.js.
//
// Sincronização entre abas: o evento `storage` só dispara em
// OUTRAS abas — a aba que escreve não recebe o próprio evento,
// então não há loop de atualização.
//
// A sacola é conveniência do navegador: preço e estoque serão
// revalidados no servidor antes de qualquer pedido (Etapa 5c+).
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  CHAVE_SACOLA,
  adicionarItem,
  lerSacolaArmazenada,
  mudarQuantidade,
  paraArmazenar,
  removerItem,
  subtotalSacola,
  totalUnidades,
  type ItemCarrinho,
} from "@/lib/pedido";

// ------------------------------------------------------------
// Estado e ações
// ------------------------------------------------------------

type Estado = {
  itens: ItemCarrinho[];
  carregado: boolean;
  /** Aviso de saneamento da sacola salva (itens removidos ou
   *  ajustados). Some em qualquer ação da própria pessoa e tem
   *  botão de fecho explícito na interface (M3). */
  aviso: string | null;
};

type Acao =
  | { tipo: "carregar"; itens: ItemCarrinho[]; problema: string | null }
  | { tipo: "adicionar"; item: ItemCarrinho }
  | { tipo: "quantidade"; variacaoId: string; quantidade: number }
  | { tipo: "remover"; variacaoId: string }
  | { tipo: "limpar" }
  | { tipo: "sincronizar"; itens: ItemCarrinho[]; problema: string | null }
  | { tipo: "dispensarAviso" };

function reducer(estado: Estado, acao: Acao): Estado {
  switch (acao.tipo) {
    case "carregar":
      return { itens: acao.itens, carregado: true, aviso: acao.problema };
    case "adicionar":
      // Limites (10 por variação com teto da foto de estoque, 20
      // linhas) vêm da função pura. Ação da pessoa limpa o aviso.
      return {
        ...estado,
        itens: adicionarItem(estado.itens, acao.item),
        aviso: null,
      };
    case "quantidade":
      return {
        ...estado,
        itens: mudarQuantidade(estado.itens, acao.variacaoId, acao.quantidade),
        aviso: null,
      };
    case "remover":
      return { ...estado, itens: removerItem(estado.itens, acao.variacaoId), aviso: null };
    case "limpar":
      return { ...estado, itens: [], aviso: null };
    case "sincronizar":
      return { ...estado, itens: acao.itens, aviso: acao.problema };
    case "dispensarAviso":
      return { ...estado, aviso: null };
  }
}

// ------------------------------------------------------------
// Contexto
// ------------------------------------------------------------

type ContextoSacola = {
  itens: ItemCarrinho[];
  /** true depois que o localStorage foi lido na primeira montagem. */
  carregado: boolean;
  /** Aviso de saneamento (M3): quando os dados salvos precisaram
   *  ser corrigidos, descartados ou limitados ao carregar. */
  aviso: string | null;
  /** Soma das quantidades (para o badge do cabeçalho). */
  unidades: number;
  /** Subtotal informativo — preço real é confirmado na finalização. */
  subtotal: number;
  adicionar: (item: ItemCarrinho) => void;
  mudarQuantidade: (variacaoId: string, quantidade: number) => void;
  remover: (variacaoId: string) => void;
  limpar: () => void;
  dispensarAviso: () => void;
};

const Contexto = createContext<ContextoSacola | null>(null);

export function CarrinhoProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, {
    itens: [],
    carregado: false,
    aviso: null,
  });

  // 1) Lê a sacola salva UMA vez, depois da primeira renderização.
  useEffect(() => {
    let itens: ItemCarrinho[] = [];
    let problema: string | null = null;
    try {
      const lido = lerSacolaArmazenada(
        window.localStorage.getItem(CHAVE_SACOLA),
      );
      itens = lido.itens;
      problema = lido.problema;
    } catch {
      // localStorage pode estar bloqueado (modo privado etc.):
      // sacola começa vazia e não persiste — o site segue funcionando.
      itens = [];
      problema = null;
    }
    dispatch({ tipo: "carregar", itens, problema });
  }, []);

  // 2) Persiste a cada mudança (depois de carregado).
  useEffect(() => {
    if (!estado.carregado) return;
    try {
      window.localStorage.setItem(
        CHAVE_SACOLA,
        JSON.stringify(paraArmazenar(estado.itens)),
      );
    } catch {
      // Sem persistência disponível: apenas não salva.
    }
  }, [estado.carregado, estado.itens]);

  // 3) Sincroniza com mudanças vindas de OUTRAS abas.
  useEffect(() => {
    const aoMudarArmazenamento = (evento: StorageEvent) => {
      if (evento.key !== CHAVE_SACOLA) return;
      let itens: ItemCarrinho[] = [];
      let problema: string | null = null;
      try {
        const lido = lerSacolaArmazenada(evento.newValue);
        itens = lido.itens;
        problema = lido.problema;
      } catch {
        return;
      }
      dispatch({ tipo: "sincronizar", itens, problema });
    };
    window.addEventListener("storage", aoMudarArmazenamento);
    return () => window.removeEventListener("storage", aoMudarArmazenamento);
  }, []);

  const adicionar = useCallback((item: ItemCarrinho) => {
    dispatch({ tipo: "adicionar", item });
  }, []);
  const mudar = useCallback((variacaoId: string, quantidade: number) => {
    dispatch({ tipo: "quantidade", variacaoId, quantidade });
  }, []);
  const remover = useCallback((variacaoId: string) => {
    dispatch({ tipo: "remover", variacaoId });
  }, []);
  const limpar = useCallback(() => {
    dispatch({ tipo: "limpar" });
  }, []);
  const dispensarAviso = useCallback(() => {
    dispatch({ tipo: "dispensarAviso" });
  }, []);

  const valor = useMemo<ContextoSacola>(
    () => ({
      itens: estado.itens,
      carregado: estado.carregado,
      aviso: estado.aviso,
      unidades: totalUnidades(estado.itens),
      subtotal: subtotalSacola(estado.itens),
      adicionar,
      mudarQuantidade: mudar,
      remover,
      limpar,
      dispensarAviso,
    }),
    [estado, adicionar, mudar, remover, limpar, dispensarAviso],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Acesso à sacola. Só pode ser usado dentro do provider
 *  (envolvido no layout raiz). */
export function useSacola(): ContextoSacola {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useSacola precisa estar dentro de <CarrinhoProvider>.");
  }
  return contexto;
}
