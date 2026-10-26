"use client";

import { useState } from "react";

export default function GaleriaPeca({ fotos, nome }: { fotos: string[]; nome: string }) {
  const [selecionada, setSelecionada] = useState(0);
  const atual = Math.min(selecionada, fotos.length - 1);
  return (
    <section aria-label={`Fotos de ${nome}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-champagne">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={fotos[atual]} alt={`${nome} — foto ${atual + 1} de ${fotos.length}`} className="absolute inset-0 h-full w-full object-contain" />
      </div>
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
    </section>
  );
}
