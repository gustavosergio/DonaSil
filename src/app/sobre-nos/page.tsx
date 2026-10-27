import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { linkWhatsApp } from "@/lib/whatsapp";
import { formatarTelefone } from "@/lib/mascaras";

export const metadata: Metadata = {
  title: "Sobre nós",
  description: "Conheça a Dona Sil Moda Feminina e encontre nossos canais oficiais de atendimento.",
};

export default function SobreNos() {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-20">
      <section aria-labelledby="titulo-sobre" className="overflow-hidden rounded-[2rem] border border-sand bg-ivory">
        <div className="grid gap-10 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-ink">Dona Sil · Moda feminina</p>
            <h1 id="titulo-sobre" className="mt-4 font-display text-4xl font-semibold text-ink sm:text-5xl">Sobre nós</h1>
            <p className="mt-6 text-lg leading-8 text-ink-soft">Por trás da loja, está a Dona Sil.</p>
            <p className="mt-4 max-w-xl leading-8 text-ink-soft">A Dona Sil Moda Feminina leva o nome de sua proprietária. Depois da experiência com a loja física, seguimos com nosso atendimento exclusivamente online.</p>
            <p className="mt-4 max-w-xl leading-8 text-ink-soft">Aqui você pode conhecer as peças, escolher seus tamanhos e montar sua sacola. E, quando precisar, é só chamar no WhatsApp para conversar com a gente e combinar os detalhes do pedido.</p>
            <Link href="/catalogo" className="mt-8 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-[#2b2420] transition hover:bg-gold-deep">Conheça nossas peças</Link>
          </div>
          {/* A foto e a história pessoal serão incluídas quando forem fornecidas pela família. */}
          <div aria-hidden="true" className="flex aspect-square max-h-80 items-center justify-center rounded-[2rem] border border-gold-soft bg-champagne p-8 text-center">
            <div><span className="font-display text-8xl text-gold-ink">DS</span><p className="mt-4 font-display text-3xl text-ink">Dona Sil</p><p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-gold-ink">Moda feminina</p></div>
          </div>
        </div>
      </section>
      <section aria-labelledby="titulo-canais" className="mt-12 sm:mt-16">
        <h2 id="titulo-canais" className="font-display text-3xl font-semibold text-ink">Perto de você, também online</h2>
        <p className="mt-3 leading-7 text-ink-soft">Acompanhe a loja e fale com a gente pelos nossos canais oficiais.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-sand bg-ivory p-6 transition hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            <h3 className="text-lg font-semibold text-gold-ink">Instagram</h3><p className="mt-2 break-words text-ink">{site.instagram}</p><p className="mt-3 text-sm leading-6 text-ink-soft">Veja as publicações e as novidades da loja.</p><span className="mt-4 inline-block text-sm font-medium text-gold-ink">Visitar Instagram ↗</span>
          </a>
          <a href={linkWhatsApp("Olá! Conheci a história da Dona Sil pelo site e gostaria de falar com vocês.")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-sand bg-ivory p-6 transition hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
            <h3 className="text-lg font-semibold text-gold-ink">WhatsApp</h3><p className="mt-2 text-ink">{formatarTelefone(site.whatsapp.replace(/^55/, ""))}</p><p className="mt-3 text-sm leading-6 text-ink-soft">Tire dúvidas sobre peças, pedidos e entregas.</p><span className="mt-4 inline-block text-sm font-medium text-gold-ink">Conversar com a loja ↗</span>
          </a>
        </div>
      </section>
    </main>
  );
}
