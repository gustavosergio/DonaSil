// ============================================================
// DONA SIL — MÁSCARAS DE DIGITAÇÃO (CEP e telefone/WhatsApp)
// ============================================================
// Camada PURA de formatação — sem React, sem rede, sem estado.
// Regras da casa:
//   * a máscara nunca decide o que é válido: só formata e limita
//     DÍGITOS (CEP 8, telefone 11). A validação de verdade
//     continua no servidor (src/lib/pedido.ts) — os formatos
//     gerados aqui ("00000-000", "(81) 92222-2222") são
//     exatamente os que o Zod de lá já aceita.
//   * excedentes são DESCARTADOS: o 9º dígito do CEP e o 12º do
//     telefone simplesmente não entram.
//   * telefone aceita fixo (10 dígitos) e celular (11): o hífen
//     fica sempre antes dos 4 últimos dígitos, então as duas
//     formas finais saem certas — (81) 3222-2222 (fixo) e
//     (81) 92222-2222 (celular).
// ============================================================

/** Remove tudo que não é dígito (0-9). */
export function soDigitos(valor: string): string {
  return valor.replace(/\D+/g, "");
}

/**
 * CEP com até 8 dígitos, exibido como 00000-000. O hífen entra a
 * partir do 6º dígito, durante a digitação. Aceita qualquer
 * entrada (colagem com lixo incluso): só os dígitos contam.
 *   formatarCep("abc52000000def") → "52000-000"
 *   formatarCep("520000000")      → "52000-000"  (9º descartado)
 */
export function formatarCep(valor: string): string {
  const digitos = soDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) {
    return digitos;
  }
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

/**
 * Telefone com até 11 dígitos (DDD incluso):
 *   1-2 dígitos  → "(81"
 *   3-6          → "(81) 3222"
 *   7-11         → hífen antes dos 4 últimos
 * Finais: fixo com 10 dígitos "(81) 3222-2222"; celular com 11
 * "(81) 92222-2222". No meio da digitação (7-9 dígitos) o hífen
 * aparece cedo, transitório — "(81) 3-2222" — comportamento
 * clássico das máscaras brasileiras.
 */
export function formatarTelefone(valor: string): string {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length === 0) {
    return "";
  }
  if (digitos.length <= 2) {
    return `(${digitos}`;
  }
  if (digitos.length <= 6) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  }
  const ddd = digitos.slice(0, 2);
  const local = digitos.slice(2);
  return `(${ddd}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`;
}

/**
 * Índice no texto FORMATADO logo antes do próximo dígito, a
 * contar de `digitosAntes` dígitos — é onde o cursor deve ficar
 * depois de reformatar (hífen e parênteses ocupam índices que o
 * cursor não pode "comer"). Exemplos:
 *   indiceAposDigitos("52000-000", 5)  → 6 (pulou o hífen)
 *   indiceAposDigitos("52000-000", 8)  → 9 (fim)
 *   indiceAposDigitos("(81) 3222", 2)  → 5 (pulou ") ")
 */
export function indiceAposDigitos(
  formatado: string,
  digitosAntes: number,
): number {
  let vistos = 0;
  for (let indice = 0; indice < formatado.length; indice++) {
    const caractere = formatado.charAt(indice);
    if (caractere >= "0" && caractere <= "9") {
      if (vistos === digitosAntes) {
        return indice;
      }
      vistos += 1;
    }
  }
  return formatado.length;
}
