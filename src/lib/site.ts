// Configuração central do site.
//
// Ausência da variável mantém a demonstração. Para abrir a vitrine,
// configure NEXT_PUBLIC_MODO_DEMO=false e gere uma nova compilação.
// Variáveis NEXT_PUBLIC são fixadas no build do Next.js.
//
// Os contatos abaixo já são os oficiais da loja.

export const MODO_DEMO = process.env.NEXT_PUBLIC_MODO_DEMO !== "false";

export const site = {
  nome: "Dona Sil",
  tagline: "Moda feminina com carinho",

  // WhatsApp oficial da loja — formato internacional, sem "+".
  whatsapp: "5581999770114",

  // Instagram oficial da loja.
  instagram: "@donasilmodafeminina",
  instagramUrl: "https://www.instagram.com/donasilmodafeminina/",
};
