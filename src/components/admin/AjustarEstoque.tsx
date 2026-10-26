"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AjustarEstoque({ id, quantidade, rotulo }: { id: string; quantidade: number; rotulo: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(String(quantidade));
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [bloqueado, setBloqueado] = useState(false);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensagem("");
    try {
      const resposta = await fetch(`/api/admin/estoque/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade: Number(valor), quantidadeAnterior: quantidade }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || dados.ok !== true) {
        setMensagem(typeof dados.mensagem === "string" ? dados.mensagem : "Não foi possível confirmar o ajuste. Recarregue a página.");
        if (resposta.status === 409 || resposta.status >= 500) setBloqueado(true);
        return;
      }
      setMensagem("Estoque salvo.");
      router.refresh();
    } catch {
      setMensagem("A conexão falhou. Recarregue a página para conferir o estoque.");
      setBloqueado(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="relative ml-auto max-w-xs">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor={`estoque-${id}`} className="sr-only">Estoque {rotulo}</label>
        <input id={`estoque-${id}`} type="number" min={0} max={1_000_000} step={1} required
          value={valor} onChange={e => setValor(e.target.value)} disabled={enviando || bloqueado}
          className="w-20 rounded-lg border border-sand bg-ivory px-2 py-2 text-right text-ink" />
        <button type="submit" disabled={enviando || bloqueado || Number(valor) === quantidade}
          className="rounded-full bg-gold px-3 py-2 text-xs font-semibold text-ink disabled:opacity-50 dark:text-[#2b2420]">
          {enviando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {mensagem && <p role="status" className="mt-2 text-xs leading-5 text-ink-soft">{mensagem}</p>}
      {bloqueado && <button type="button" className="mt-1 text-xs text-gold-ink underline" onClick={() => window.location.reload()}>Recarregar para conferir</button>}
    </form>
  );
}
