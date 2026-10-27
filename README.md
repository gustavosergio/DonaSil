# Site Dona Sil

Loja virtual da Dona Sil — moda feminina com vendas online.

Catálogo real com finalização pelo WhatsApp e seção Desapego para objetos de casa.

## Tecnologias

- **Next.js 16** (App Router) + **TypeScript** — páginas e lógica do site
- **Tailwind CSS 4** — visual e identidade
- **Supabase** — produtos, estoque, autenticação do painel e fotos
- **Hospedagem** — Cloudflare Workers com OpenNext; não é uma exportação estática para Pages.

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
| `npm run publicacao:verificar` | Confere catálogo, fotos, entrega e leitura privada |
| `npm run cloudflare:check` | Compila e simula a publicação na Cloudflare |
| `npm run cloudflare:deploy` | Publica após autenticação e verificação do catálogo |

Veja [CLOUDFLARE.md](CLOUDFLARE.md) para publicar e [GUIA-DA-LOJA.md](GUIA-DA-LOJA.md) para atender as vendas e atualizar o estoque.

## Segurança

Antes de enviar alterações ao GitHub, execute `npm run verificar:push`. Esse comando verifica regras, lint, tipos, compilação sem credenciais, pacote Cloudflare e testes de navegador em sequência. Só aprova se os arquivos continuarem iguais até o final.

Para bloquear um push que ainda não foi validado nesta máquina, execute `npm run hooks:instalar`. O hook usa uma aprovação local válida por até duas horas e vinculada ao conteúdo exato dos arquivos; se o código mudar, verifica novamente. Em um clone novo, instale o hook com o mesmo comando. As notificações de falha do GitHub continuam habilitadas.

As fontes ficam em `src/app/fonts`, com suas licenças, para a compilação não depender do Google Fonts. O zoom restaura a rolagem no próprio fechamento e os testes aguardam o estado correto do navegador, sem pausas arbitrárias.

- Nunca coloque senhas, tokens ou chaves em arquivos de código.
- Valores secretos ficam em `.env.local` (fora do GitHub) ou no painel da
  hospedagem. Veja o modelo em `.env.example`.

## Histórico do projeto

Este projeto usa Git. Cada mudança importante vira um "commit" (ponto de
restauração). O histórico completo fica visível com `git log`.
