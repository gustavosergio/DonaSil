import Link from "next/link";
import { formatarBRL } from "@/lib/format";
import type { ProdutoDemo } from "@/types/produto";

/**
 * Cartão de produto. Na Etapa 2 exibe apenas dados demonstrativos;
 * a foto real entra quando a loja enviar (a área rosa reserva o espaço).
 */
export default function ProductCard({ produto }: { produto: ProdutoDemo }) {
  return (
    <Link
      href="/catalogo"
      aria-label={`${produto.nome}, ${formatarBRL(produto.preco)} — ver no catálogo`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-champagne">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-soft/50 via-champagne to-sand transition-transform duration-300 group-hover:scale-[1.02]" />
        <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-soft">
          Foto demonstrativa
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          {produto.categoria}
        </p>
        <h3 className="font-medium text-ink">{produto.nome}</h3>
        <p className="text-sm text-ink-soft">{formatarBRL(produto.preco)}</p>
        <ul className="flex gap-1.5 pt-1" aria-label="Cores disponíveis">
          {produto.cores.map((cor) => (
            <li
              key={cor.nome}
              title={cor.nome}
              aria-label={`Cor ${cor.nome}`}
              className="h-3.5 w-3.5 rounded-full border border-black/10"
              style={{ backgroundColor: cor.hex }}
            />
          ))}
        </ul>
      </div>
    </Link>
  );
}
