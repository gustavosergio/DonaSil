import { site } from "./site";

/**
 * Monta o link wa.me com mensagem pré-preenchida.
 * Exemplo de uso: linkWhatsApp("Olá! Tenho uma dúvida.")
 */
export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}
