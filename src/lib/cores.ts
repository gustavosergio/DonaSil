/** O painel recebe apenas o nome; o tom da vitrine é uma aproximação. */
export function tomDaCor(nome: string): string {
  const chave = nome.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tons: Record<string, string> = {
    vermelho: "#c62828", vermelha: "#c62828", azul: "#245aa5",
    verde: "#388e3c", preto: "#202020", preta: "#202020",
    branco: "#fafafa", branca: "#fafafa", rosa: "#df8ca9",
    amarelo: "#e9c735", amarela: "#e9c735", roxo: "#7b4397",
    roxa: "#7b4397", lilas: "#b39ddb", bege: "#d6c3a3",
    marrom: "#795548", cinza: "#808080", laranja: "#ef7d32",
    vinho: "#722f37", "off-white": "#f4efe5", unica: "#808080",
  };
  return tons[chave] ?? "#808080";
}
