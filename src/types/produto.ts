export type Cor = {
  nome: string;
  hex: string;
};

// Modelo usado pelas versões demonstrativas do site.
// Na Etapa 3 (banco de dados) este tipo cresce para refletir o catálogo real.
export type ProdutoDemo = {
  id: string;
  slug: string;
  nome: string;
  descricaoCurta: string;
  preco: number;
  categoria: string;
  cores: Cor[];
  tamanhos: string[];
};
