import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CarrinhoProvider } from "@/components/CarrinhoProvider";
import MostrarForaDoPainel from "@/components/MostrarForaDoPainel";
import { MODO_DEMO } from "@/lib/site";

export const dynamic = "force-dynamic";

const playfair = localFont({
  variable: "--font-playfair",
  src: [
    { path: "./fonts/PlayfairDisplay[wght].ttf", weight: "500 700", style: "normal" },
    { path: "./fonts/PlayfairDisplay-Italic[wght].ttf", weight: "500 700", style: "italic" },
  ],
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const poppins = localFont({
  variable: "--font-poppins",
  src: [
    { path: "./fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dona Sil — Moda Feminina",
    template: "%s — Dona Sil",
  },
  description:
    "Moda feminina escolhida com carinho. Explore as peças da Dona Sil, monte sua sacola e combine pagamento e entrega pelo WhatsApp.",
  robots: MODO_DEMO ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${playfair.variable} ${poppins.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica o tema salvo ANTES da página aparecer — evita
            "flash" de tema errado. Ordem: escolha salva no
            navegador → preferência do sistema → claro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("donasil-tema");var e=t==="escuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=document.documentElement.classList;e?c.add("dark"):c.remove("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-cream font-sans text-ink">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-gold focus:px-4 focus:py-2 focus:text-ink dark:focus:text-[#2b2420]"
        >
          Pular para o conteúdo
        </a>
        {/* A sacola vive no navegador (localStorage) e precisa
            envolver também o cabeçalho (badge de unidades). */}
        <CarrinhoProvider>
          {/* O painel /admin tem navegação própria: o cabeçalho e o
              rodapé da loja ficam ocultos lá.
              O componente lê a rota atual, então vai dentro de um
              Suspense (exigência do casca estático do Next 16). */}
          <Suspense fallback={null}>
            <MostrarForaDoPainel>
              <Header />
            </MostrarForaDoPainel>
          </Suspense>
          {children}
          <Suspense fallback={null}>
            <MostrarForaDoPainel>
              <Footer />
            </MostrarForaDoPainel>
          </Suspense>
        </CarrinhoProvider>
        <WhatsAppFloat />
      </body>
    </html>
  );
}
