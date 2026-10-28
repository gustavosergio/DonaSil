import Link from "next/link";
import Image from "next/image";
import { MODO_DEMO, site } from "@/lib/site";
import { linkWhatsApp } from "@/lib/whatsapp";
import { formatarTelefone } from "@/lib/mascaras";

export default function Footer() {
  return (
    <footer className="border-t border-sand bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <Link href="/" aria-label="Dona Sil — página inicial" className="inline-flex overflow-hidden rounded-full bg-white">
            <Image src="/marca/logo-dona-sil.webp" alt="Dona Sil Moda Feminina" width={96} height={96} unoptimized />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-soft">
            Atendimento próximo, do jeito que sempre foi — agora
            também online.
          </p>
        </div>

        <nav aria-label="Links do site">
          <p className="text-sm font-semibold text-ink">Navegar</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/" className="transition hover:text-gold-ink">
                Início
              </Link>
            </li>
            <li>
              <Link href="/catalogo" className="transition hover:text-gold-ink">
                Catálogo
              </Link>
            </li>
            <li><Link href="/desapego" className="transition hover:text-gold-ink">Desapego</Link></li>
            <li><Link href="/sobre-nos" className="transition hover:text-gold-ink">Sobre nós</Link></li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold text-ink">Contato</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>
              <a
                href={linkWhatsApp(
                  "Olá! Vim pelo site da Dona Sil e tenho uma dúvida."
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-gold-ink"
              >
                WhatsApp · {formatarTelefone(site.whatsapp.replace(/^55/, ""))}
              </a>
            </li>
            <li>
              <a
                href={site.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 transition hover:text-gold-ink"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
                </svg>
                {site.instagram}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sand px-4 py-6 text-center text-xs leading-6 text-ink-soft sm:px-6">
        {MODO_DEMO && (
          <p>
            Modo demonstração: nomes, preços e fotos exibidos são exemplos
            fictícios até a publicação oficial.
          </p>
        )}
        <p>© 2026 {site.nome}. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
