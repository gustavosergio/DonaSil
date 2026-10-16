/**
 * Formata um número como moeda brasileira.
 * Exemplo: 189.9 -> "R$ 189,90"
 */
export function formatarBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}
