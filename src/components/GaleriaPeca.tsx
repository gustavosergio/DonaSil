"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export default function GaleriaPeca({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [selecionada, setSelecionada] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dialogo = useRef<HTMLDialogElement>(null);
  const areaImagem = useRef<HTMLDivElement>(null);
  const overflowAnterior = useRef<string | null>(null);
  const atual = Math.min(selecionada, fotos.length - 1);

  useEffect(() => () => {
    if (overflowAnterior.current !== null) document.body.style.overflow = overflowAnterior.current;
  }, []);

  function abrirZoom() {
    setZoom(1);
    dialogo.current?.showModal();
    overflowAnterior.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    areaImagem.current?.scrollTo(0, 0);
  }

  function aoFechar() {
    if (overflowAnterior.current !== null) {
      document.body.style.overflow = overflowAnterior.current;
      overflowAnterior.current = null;
    }
  }

  function trocarFoto(indice: number) {
    setSelecionada(indice);
    setZoom(1);
    areaImagem.current?.scrollTo(0, 0);
  }

  function mudarZoom(delta: number) {
    setZoom(valor => Math.min(3, Math.max(1, valor + delta)));
    requestAnimationFrame(() => {
      const area = areaImagem.current;
      if (area) area.scrollTo((area.scrollWidth - area.clientWidth) / 2, (area.scrollHeight - area.clientHeight) / 2);
    });
  }

  function ampliarComMouse(evento: PointerEvent<HTMLButtonElement>) {
    if (evento.pointerType !== "mouse") return;
    const area = evento.currentTarget;
    const limites = area.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (evento.clientX - limites.left) / limites.width * 100));
    const y = Math.max(0, Math.min(100, (evento.clientY - limites.top) / limites.height * 100));
    area.style.setProperty("--zoom-foto", "2.5");
    area.style.setProperty("--origem-foto", `${x}% ${y}%`);
  }

  function encerrarZoomMouse(evento: PointerEvent<HTMLButtonElement>) {
    evento.currentTarget.style.setProperty("--zoom-foto", "1");
    evento.currentTarget.style.removeProperty("--origem-foto");
  }

  if (!fotos.length) return null;
  return (
    <section aria-label={`Fotos de ${nome}`}>
      <button type="button" onClick={abrirZoom} onPointerEnter={ampliarComMouse} onPointerMove={ampliarComMouse} onPointerLeave={encerrarZoomMouse} onPointerCancel={encerrarZoomMouse} aria-label={`Ampliar foto ${atual + 1} de ${nome}`} className="relative block aspect-[3/4] w-full cursor-zoom-in select-none overflow-hidden rounded-3xl bg-champagne focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotos[atual]} alt={`${nome} — foto ${atual + 1} de ${fotos.length}`} draggable={false} style={{ transform: "scale(var(--zoom-foto, 1))", transformOrigin: "var(--origem-foto, 50% 50%)" }} className="absolute inset-0 h-full w-full object-contain transition-transform duration-150 ease-out motion-reduce:transition-none" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-black/70 px-4 py-2 text-xs font-medium text-white">Passe o mouse ou toque para ampliar</span>
      </button>
      {fotos.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-3" aria-label="Escolher foto">
          {fotos.map((foto, indice) => (
            <button key={foto} type="button" aria-label={`Ver foto ${indice + 1} de ${nome}`} aria-pressed={atual === indice} onClick={() => setSelecionada(indice)} className={`h-24 w-20 overflow-hidden rounded-xl border-2 bg-champagne transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${atual === indice ? "border-gold" : "border-sand hover:border-gold-soft"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <dialog ref={dialogo} onClose={aoFechar} aria-labelledby="titulo-zoom" onClick={evento => { if (evento.target === evento.currentTarget) dialogo.current?.close(); }} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-[#141414] p-0 text-white backdrop:bg-black/80">
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 px-4 py-3 sm:px-6">
            <p id="titulo-zoom" className="min-w-0 flex-1 text-sm font-medium">{nome}</p>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Diminuir zoom" disabled={zoom <= 1} onClick={() => mudarZoom(-0.5)} className="h-11 w-11 rounded-full bg-white/15 text-xl hover:bg-white/25 disabled:opacity-40">−</button>
              <output aria-label="Nível de zoom" aria-live="polite" className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</output>
              <button type="button" aria-label="Aumentar zoom" disabled={zoom >= 3} onClick={() => mudarZoom(0.5)} className="h-11 w-11 rounded-full bg-white/15 text-xl hover:bg-white/25 disabled:opacity-40">+</button>
              <button type="button" aria-label="Fechar imagem ampliada" onClick={() => dialogo.current?.close()} className="ml-2 min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-white/85">Fechar ×</button>
            </div>
          </div>
          <div ref={areaImagem} className="min-h-0 flex-1 overflow-auto overscroll-contain" aria-label="Imagem ampliada; deslize para explorar os detalhes">
            <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="p-3 sm:p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotos[atual]} alt={`${nome} — foto ampliada ${atual + 1} de ${fotos.length}`} className="h-full w-full max-w-none object-contain" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 border-t border-white/20 px-4 py-3 text-xs">
            {fotos.length > 1 && <button type="button" aria-label="Foto anterior" disabled={atual === 0} onClick={() => trocarFoto(atual - 1)} className="min-h-11 rounded-full bg-white/15 px-4 disabled:opacity-40">← Anterior</button>}
            <p>Foto {atual + 1} de {fotos.length} · Use + para ampliar e deslize para ver os detalhes.</p>
            {fotos.length > 1 && <button type="button" aria-label="Próxima foto" disabled={atual === fotos.length - 1} onClick={() => trocarFoto(atual + 1)} className="min-h-11 rounded-full bg-white/15 px-4 disabled:opacity-40">Próxima →</button>}
          </div>
        </div>
      </dialog>
    </section>
  );
}
