# Publicar na Cloudflare Workers

A loja usa Next.js com o adaptador OpenNext. O painel, as APIs e a finalização precisam de Workers; não use uma exportação estática para Pages. O pacote foi configurado sem R2, D1 ou serviços de pagamento adicionais.

## Configuração

Use Node 24 e instale as dependências com `npm ci`. Configure no ambiente de compilação:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MODO_DEMO=false`

Os valores locais ficam em `.env.local`, que não é enviado ao GitHub. A chave `SUPABASE_SECRET_KEY` não é necessária na hospedagem: o painel usa a sessão da administradora e as políticas do Supabase. O comando de compilação remove essa chave do processo e verifica que ela não foi incluída no pacote.

## Verificação antes de publicar

```powershell
npm run publicacao:verificar
npm test
npm run lint
npm run test:e2e
npm run cloudflare:check
node scripts/verificar-cloudflare.cjs --start
```

`cloudflare:check` compila a loja, gera o pacote Workers, confere arquivos locais e executa uma simulação de publicação. A verificação seguinte testa o pacote no runtime Workers local, incluindo catálogo real, sacola, formulário, cálculo de total e link de WhatsApp, sem enviar mensagens nem registrar vendas.

## Conectar a conta e publicar

Para autorizar usando o navegador, inclusive pelo celular:

```powershell
npx wrangler login --device --scopes account:read user:read workers_scripts:write workers_routes:write
npx wrangler whoami
npm run cloudflare:deploy
```

A autenticação é feita diretamente na Cloudflare. Não coloque senha, código de recuperação ou token no código ou no chat.

O Worker preparado se chama `loja-dona-sil`. A Cloudflare informa o endereço HTTPS `workers.dev` após a publicação. Um domínio próprio pode ser associado depois. Não é necessário contratar um domínio para conferir a primeira versão.

No Workers Builds conectado ao GitHub, use `npm run cloudflare:build` como build e `npx opennextjs-cloudflare deploy -- --keep-vars` como deploy. Configure as três variáveis públicas também no painel do projeto. O workflow do GitHub valida o código e o pacote; ele não publica automaticamente.

Antes de divulgar o endereço, execute `scripts/verificar-site.cjs` e `scripts/verificar-cloudflare.cjs` com `TEST_BASE_URL` apontando para o endereço publicado. Confira também a entrada no painel com a conta administrativa real. Não altere automaticamente para um plano pago caso a conta informe limites.

## Operação da loja

O lançamento usa confirmação pelo WhatsApp, sem cobrança automática ou reserva automática de estoque. Siga [GUIA-DA-LOJA.md](GUIA-DA-LOJA.md). O modo real é o padrão; a demonstração exige `NEXT_PUBLIC_MODO_DEMO=true` e uma nova compilação.

Referência: [adaptador OpenNext na documentação da Cloudflare](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).
