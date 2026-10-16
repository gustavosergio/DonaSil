import type { ProdutoDemo } from "@/types/produto";

// DADOS DEMONSTRATIVOS — nomes, preços e cores são exemplos fictícios.
// Substituídos pelos produtos reais da loja na Etapa 10.

export const produtosDemo: ProdutoDemo[] = [
  {
    id: "demo-001",
    slug: "vestido-midi-florida",
    nome: "Vestido Midi Florida",
    descricaoCurta: "Vestido midi leve com estampa floral delicada.",
    preco: 189.9,
    categoria: "Vestidos",
    cores: [
      { nome: "Dourado", hex: "#cbb389" },
      { nome: "Off-white", hex: "#f5efe6" },
    ],
    tamanhos: ["P", "M", "G"],
  },
  {
    id: "demo-002",
    slug: "blusa-cetim-laco",
    nome: "Blusa Cetim Laço",
    descricaoCurta: "Blusa em cetim com laço detalhado na gola.",
    preco: 89.9,
    categoria: "Blusas",
    cores: [
      { nome: "Marrom", hex: "#8a6a42" },
      { nome: "Preto", hex: "#2b2420" },
    ],
    tamanhos: ["P", "M", "G", "GG"],
  },
  {
    id: "demo-003",
    slug: "saia-plissada-midi",
    nome: "Saia Plissada Midi",
    descricaoCurta: "Saia plissada com caimento fluido.",
    preco: 129.9,
    categoria: "Saias",
    cores: [
      { nome: "Terracota", hex: "#b4664c" },
      { nome: "Areia", hex: "#d9c7a7" },
    ],
    tamanhos: ["P", "M"],
  },
  {
    id: "demo-004",
    slug: "kimono-estampado",
    nome: "Kimono Estampado",
    descricaoCurta: "Kimono aberto com estampa exclusiva.",
    preco: 149.9,
    categoria: "Kimonos",
    cores: [
      { nome: "Estampado", hex: "#cbb389" },
    ],
    tamanhos: ["P/M", "G/GG"],
  },
];
