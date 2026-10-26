# Site Dona Sil

Loja virtual da Dona Sil — moda feminina com vendas online.

Site em construção. Primeira versão planejada para novembro de 2026.

## Tecnologias

- **Next.js 16** (App Router) + **TypeScript** — páginas e lógica do site
- **Tailwind CSS 4** — visual e identidade
- **Supabase** (a partir da Etapa 3) — produtos, estoque, pedidos e fotos
- **Hospedagem** — requer execução de servidor Next.js para cookies, Server Actions e rotas de API; não é uma exportação estática.

## Como rodar no seu computador

Abra a pasta do projeto no terminal e execute:

```bash
npm install    # só na primeira vez
npm run dev    # inicia o site de teste
```

Depois abra http://localhost:3000 no navegador. Para parar, pressione
Ctrl+C no terminal.

## Comandos principais

A revisão e as pendências para abertura comercial estão em [PUBLICACAO.md](PUBLICACAO.md).
Use `npm test` para as regras comerciais. A compilação padrão usa Webpack;
`npm run build:turbopack` mantém a alternativa com Turbopack.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Site de teste com recarregamento automático |
| `npm run build` | Gera a versão final (usada pela hospedagem) |
| `npm run start` | Roda a versão final localmente |
| `npm run lint` | Verifica erros de estilo no código |

## Segurança

- Nunca coloque senhas, tokens ou chaves em arquivos de código.
- Valores secretos ficam em `.env.local` (fora do GitHub) ou no painel da
  hospedagem. Veja o modelo em `.env.example`.

## Histórico do projeto

Este projeto usa Git. Cada mudança importante vira um "commit" (ponto de
restauração). O histórico completo fica visível com `git log`.
