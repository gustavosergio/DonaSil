# Preparação para publicação — Dona Sil

## Revisão prática — 26/10/2026

As alterações estão nesta pasta de trabalho e incluem a alteração SQL
preexistente da cópia original. Nenhum SQL foi aplicado nesta revisão.

Falhas corrigidas durante os testes:

- O reset automático do formulário desmarcava a região após erro de entrega.
  Agora os dados e a região permanecem preenchidos.
- Navegação após login podia perder o destino por reutilizar cache anterior
  à sessão. Entrada e saída agora fazem navegação completa.
- O servidor aceitava UFs inexistentes, como `XX`; agora valida as 27 UFs.
- Falha HTTP 5xx do login era apresentada como senha incorreta; agora indica
  indisponibilidade do serviço.
- Um rótulo invisível do estoque escapava da área rolável da tabela no celular,
  ampliando a página e impedindo clicar no logout. O posicionamento foi corrigido
  e o teste verifica a largura da página e o clique real em “Sair”.

Também foram preservadas e verificadas as melhorias de catálogo, consulta de
CEP, proteção de resumo desatualizado, autenticação do painel, ajuste de estoque
com detecção de concorrência e cabeçalhos de segurança.

Os testes de navegador usam uma compilação de produção com servidor de dados
fictícios, em computador e celular. Cobrem busca e categorias, persistência da
sacola, entrega, retirada, frete grátis, preço adulterado no navegador, mudança
da sacola em outra aba, UF inválida, login, logout, estoque concorrente, menu e
tema. As capturas de computador/celular e tema escuro foram inspecionadas.
Os testes isolados incluem cadastro, cores, variações e compensação de falha
parcial. Isso não substitui validar login e políticas com uma conta real.

Resultado final local: **22/22 testes de navegador passaram** na mesma rodada,
assim como testes isolados, ESLint, TypeScript e compilação de produção.
A auditoria `npm audit --omit=dev` não encontrou vulnerabilidades conhecidas.
Os testes também verificam ausência de erros JavaScript não tratados na página.

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

O GitHub Actions executa lint, testes, compilação, TypeScript e testes de
navegador a cada atualização. Esse workflow não publica o site.

**Catálogo real reconsultado:** os dois produtos reais são “vestido teste” e
“teste 2”. Ambos estão sem descrição; “teste 2” também está sem foto e sem
estoque. Nenhuma peça real disponível está marcada como destaque. É necessário
preencher os dados comerciais definitivos antes de abrir a loja. As fotos
existentes foram verificadas por disponibilidade e tipo de arquivo.

Verificação de leitura que reprova enquanto houver pendências no catálogo:

```powershell
node scripts/verificar-publicacao.cjs --exigir-pronto
```

Use Node 24 para reproduzir o ambiente desta revisão. O checkout atual conclui
o atendimento pelo WhatsApp: não registra pedidos nem reserva estoque.

## Estado verificado

- Fonte de trabalho: cópia do GitHub nesta pasta, com a alteração local de
  `supabase/funcoes-estoque.sql` preservada da pasta original informada.
- Supabase consultado somente por leitura pública: 22 produtos visíveis,
  dos quais 20 de demonstração e 2 reais ativos.
- Seis faixas comerciais ativas, com valores de R$ 9,99, R$ 19,99,
  R$ 29,99, R$ 29,99, R$ 34,99 e retirada gratuita; três antigas desativadas.
- Checkout confere preços e estoque no servidor e prepara o WhatsApp.
  Ainda não registra pedidos nem reserva estoque. A tela informa esse fluxo.
- Painel tem autenticação administrativa, produtos e fotos; configurações
  continuam somente para consulta e pedidos dependem da integração de gravação.

## Correções desta revisão

- Subtotal e total da finalização calculados em centavos inteiros.
- Modo demonstração com `noindex` e `robots.txt` bloqueando rastreamento.
- Testes reproduzíveis para tarifas, limite de gratuidade, UF/região,
  formato do CEP e privacidade do endereço na retirada.
- Integração Tailwind via PostCSS, permitindo testar Webpack além de Turbopack.
- Compilação padrão usa Webpack, validado nesta revisão. Turbopack continua
  disponível com `npm.cmd run build:turbopack` para investigação posterior.
- Catálogo, destaques e páginas individuais passam a exigir `demo=false`
  quando `MODO_DEMO=false`, inclusive em acessos diretos por links antigos.
  O modo demonstração permanece ativo nesta preparação. Testes isolados
  verificam os filtros nos dois modos, sem consultar ou alterar o banco.

## Validação

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build:webpack
```

A compilação precisa acessar o Google Fonts. O Turbopack apresentou falha
interna ao iniciar o processo que transforma CSS neste Windows.
Testes, ESLint, TypeScript e compilação de produção com Webpack passaram.
Também passaram as verificações HTTP de `/`, `/catalogo`, `/sacola`,
`/finalizar` e `/robots.txt` (200), e o redirecionamento de `/admin` para
login sem sessão. Isso não substitui os testes visuais e de interação.

Para reproduzir essa verificação após compilar (inicia e encerra um servidor
próprio na porta 3002):

```powershell
node scripts/verificar-site.cjs --start
```

Consulta pública opcional ao banco configurado, sem imprimir chaves:

```powershell
node scripts/verificar-supabase.cjs
```

Esse script exige Node com `process.loadEnvFile` e verifica que a URL é a do
projeto informado pelo proprietário. Não altera registros.

## Pendências antes da abertura comercial

Revalidação local em 26/10/2026: `npm.cmd test` (incluindo o novo teste
de catálogo), `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`
e `node scripts/verificar-site.cjs --start` passaram. O teste HTTP confirma
status e redirecionamento; os testes de interação e a nova consulta pública
ao Supabase estão descritos na revisão prática acima. Nenhum SQL foi executado.

1. Revisar os dois produtos reais, fotos, variações, preços e quantidades.
2. Conferir a vitrine com `MODO_DEMO=false` no ambiente de homologação:
   os produtos de demonstração serão filtrados automaticamente pelo site.
   Isso não apaga nem desativa registros no Supabase e não modifica RLS.
3. Escolher o fluxo de lançamento: atendimento pelo WhatsApp como funciona
   hoje, ou integração transacional de pedidos e estoque. No segundo caso,
   implementar e testar gravação, idempotência, confirmação, cancelamento e
   expiração; validar também UF/região e as regras comerciais dentro da RPC.
4. Repetir a conferência no domínio definitivo com uma conta administrativa
   real e os produtos finais. Os testes automatizados de navegador usam dados
   fictícios para não alterar a loja real.
5. Configurar a hospedagem com suporte a servidor Next.js: existem cookies,
   Server Actions e rotas de API, portanto não basta exportar HTML estático.
   Configurar variáveis no painel da hospedagem e manter `.env.local` fora do Git.
6. Definir domínio, conferir HTTPS e realizar os testes no endereço definitivo.
7. Trocar `MODO_DEMO` para `false` somente quando catálogo e fluxo comercial
   estiverem prontos. Isso também libera a indexação da vitrine.

Nenhum SQL foi executado, nenhuma compra foi habilitada e nenhuma publicação
foi feita nesta revisão. As leituras públicas não validam RLS administrativa,
funções de estoque ou login com uma conta real.
