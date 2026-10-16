// Configuração central do site.
//
// MODO_DEMO = true enquanto o site usa apenas dados fictícios.
// Na Etapa 10 (dados reais) este valor muda para false e os avisos
// de demonstração desaparecem automaticamente.

export const MODO_DEMO = true;

export const site = {
  nome: "Dona Sil",
  tagline: "Moda feminina com carinho",

  // Contato DEMO — trocado pelo número real da loja na Etapa 10.
  // Formato internacional, sem "+" e sem espaços.
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5511999999999",

  // Identificação DEMO — perfil real será informado pela loja.
  instagram: "@donasil",
};
