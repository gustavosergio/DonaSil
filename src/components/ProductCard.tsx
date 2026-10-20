import Link from "next/link";
import { formatarBRL } from "@/lib/format";
import type { ProdutoResumo } from "@/lib/catalogo";

/**
 * Cartão de produto do catálogo real.
 *
 * Mostra o selo "Esgotado" quando o produto não tem NENHUMA
 * variação com estoque (a disponibilidade vem calculada da camada
 * de dados, direto do banco). A foto real entra quando a loja
 * cadastrar no Storage (Etapa 10) — a área rosa reserva o espaço.
 */
export default function ProductCard({ produto }: { produto: ProdutoResumo }) {
  const rotulo = `${produto.nome}, ${formatarBRL(produto.preco)}${
    produto.disponivel ? "" : " — esgotado"
  }`;

  return (
    <Link
      href={`/catalogo/${produto.slug}`}
      aria-label={`${rotulo} — ver detalhes`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-champagne">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-soft/50 via-champagne to-sand transition-transform duration-300 group-hover:scale-[1.02]" />
        {!produto.disponivel && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-ivory">
            Esgotado
          </span>
        )}
        <div className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-xs text-ink-soft dark:bg-ivory">
          Foto demonstrativa
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          {produto.categoriaNome}
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
