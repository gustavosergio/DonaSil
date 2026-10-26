import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import { listarProdutos } from "@/lib/catalogo";
import { linkWhatsApp } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Desapego — Casa e decoração",
  description: "Objetos de casa, decoração e utilidades em busca de um novo lar. Conheça os desapegos e combine a compra pelo WhatsApp.",
};

export default function PaginaDesapego() {
  return (
    <main id="conteudo" className="flex-1">
      <section className="border-b border-sand bg-champagne">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-ink">Desapego · Casa & boas histórias</p><h1 className="mt-5 text-5xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl">Sai daqui.<br />Ganha um novo lar.</h1><p className="mt-5 max-w-lg text-base leading-8 text-ink-soft">Um cantinho para passar adiante coisas de casa: utilidades, decoração e objetos que podem fazer parte da sua história.</p><a href="#itens-desapego" className="mt-7 inline-block rounded-full bg-gold px-6 py-3 text-sm font-semibold text-ivory transition hover:bg-gold-deep">Ver itens disponíveis ↓</a></div>
          <div aria-hidden="true" className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-full border border-gold-soft bg-ivory">
            <svg viewBox="0 0 300 300" fill="none" className="h-64 w-64 text-gold-ink"><path d="M35 230h230" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><rect x="50" y="60" width="115" height="130" rx="5" fill="var(--color-champagne)" stroke="currentColor" strokeWidth="3"/><path d="m65 165 30-40 22 23 30-55M110 80h25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><path d="M192 160h50c0 40 19 70-25 70s-25-30-25-70Z" fill="#e9b18b" stroke="currentColor" strokeWidth="3"/><path d="M217 160V85m0 37c-27-4-34-21-30-33 22 3 30 17 30 33Zm0-14c27-4 34-21 30-33-22 3-30 17-30 33Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M89 190v40m-20 0h40" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
            <span className="absolute -bottom-2 right-2 rotate-[-8deg] rounded-2xl bg-[#f2b989] px-5 py-3 text-sm font-semibold text-[#173d38]">Reusar é recomeçar.</span>
          </div>
        </div>
      </section>
      <section id="itens-desapego" aria-labelledby="titulo-itens" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-gold-ink">Olhe com carinho</p><h2 id="titulo-itens" className="mt-2 text-3xl font-semibold">Disponíveis para desapegar</h2></div><Link href="/catalogo" className="text-sm font-medium text-gold-ink underline underline-offset-4">Procurando roupas? Vá para a loja</Link></div>
        <Suspense fallback={<p role="status" className="py-12 text-ink-soft">Carregando os desapegos…</p>}><ItensDesapego /></Suspense>
        <div className="mt-12 grid gap-5 border-t border-sand pt-8 text-sm leading-7 text-ink-soft sm:grid-cols-3"><p><strong className="block text-ink">Veja os detalhes</strong>Confira as fotos, medidas e o estado de conservação na descrição de cada item.</p><p><strong className="block text-ink">Tire suas dúvidas</strong>Converse pelo WhatsApp antes de concluir a compra.</p><p><strong className="block text-ink">Combine a entrega</strong>O transporte ou a retirada de cada objeto é confirmado no atendimento.</p></div>
      </section>
    </main>
  );
}

async function ItensDesapego() {
  let itens;
  try { itens = await listarProdutos({ secao: "desapego" }); }
  catch { return <p role="alert" className="mt-8 rounded-2xl border border-sand bg-ivory p-6 text-ink-soft">Não foi possível carregar os desapegos agora. Tente novamente em instantes ou fale com a gente pelo WhatsApp.</p>; }
  if (!itens.length) return <div className="mt-8 rounded-3xl border border-dashed border-gold-soft bg-ivory px-6 py-14 text-center"><p className="text-2xl font-semibold text-ink">Os próximos desapegos estão chegando.</p><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-ink-soft">Quando os primeiros objetos forem anunciados, as fotos, os valores e os detalhes aparecerão aqui.</p><a href={linkWhatsApp("Olá! Gostaria de saber sobre os itens do Desapego.")} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block rounded-full border border-gold px-6 py-3 text-sm font-semibold text-gold-ink hover:bg-champagne">Perguntar sobre os desapegos</a></div>;
  return <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">{itens.map(item => <li key={item.id}><ProductCard produto={item} /></li>)}</ul>;
}
