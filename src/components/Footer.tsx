import Link from "next/link";
import { MODO_DEMO, site } from "@/lib/site";
import { linkWhatsApp } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="border-t border-sand bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display text-2xl font-semibold text-wine">
            {site.nome}
          </p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-soft">
            {site.tagline}. Atendimento próximo, do jeito que sempre foi —
            agora também online.
          </p>
        </div>

        <nav aria-label="Links do site">
          <p className="text-sm font-semibold text-ink">Navegar</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/" className="transition hover:text-wine">
                Início
              </Link>
            </li>
            <li>
              <Link href="/catalogo" className="transition hover:text-wine">
                Catálogo
              </Link>
            </li>
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
                className="transition hover:text-wine"
              >
                WhatsApp
              </a>
            </li>
            <li>
              Instagram: {site.instagram}
              {MODO_DEMO && (
                <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-xs text-ink-soft">
                  demonstrativo
                </span>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-sand px-4 py-6 text-center text-xs leading-6 text-ink-soft sm:px-6">
        {MODO_DEMO && (
          <p>
            Modo demonstração: nomes, preços e contatos exibidos são fictícios
            até a publicação oficial.
          </p>
        )}
        <p>© 2026 {site.nome}. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
