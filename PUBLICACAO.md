# Publicacao da Dona Sil - revisao de 27/10/2026

O projeto de trabalho e o Site da pasta teste opencode/Dona Sil/Site. As vendas sao confirmadas pelo WhatsApp; o site nao cobra nem reserva estoque automaticamente.

## Catalogo e configuracao

- Modo real por padrao e NEXT_PUBLIC_MODO_DEMO=false no ambiente local.
- 17 produtos reais cadastrados, 26 fotos e estoque inicial de uma unidade por peca, conforme confirmado pela responsavel.
- 20 produtos de demonstracao desativados.
- Seis faixas de entrega ativas; o servidor valida regiao e UF.
- Cartao por InfinitePay ou maquininha com acrescimo de 15% sobre os produtos, com frete separado.
- Desapego separado da moda, com transporte combinado pelo atendimento.
- Painel com orientacao de baixa manual do estoque ao reservar ou vender.

## Hospedagem

Publicado na Cloudflare Workers com OpenNext em 27/10/2026: https://loja-dona-sil.donasil-gustavosergio.workers.dev. Conferencia no endereco publico aprovada em computador e celular, incluindo catalogo real, sacola, finalizacao e protecao do painel. Veja CLOUDFLARE.md para os comandos e configuracao.

O GitHub Actions verifica codigo, testes e pacote Cloudflare; nao publica automaticamente. Novas alteracoes precisam ser publicadas na Cloudflare apos as verificacoes.

## Conferencias

```powershell
npm run publicacao:verificar
npm test
npm run lint
npm run test:e2e
npm audit --audit-level=high
npm run cloudflare:check
node scripts/verificar-cloudflare.cjs --start
```

A auditoria de publicacao consulta apenas dados publicos: produtos reais, fotos, entrega e protecao das tabelas privadas. A simulacao da Cloudflare verifica o pacote sem publicar. Os testes de navegador usam dados ficticios e o teste Workers usa o catalogo real somente para leitura; nao enviam mensagens nem registram vendas.

## Rotina da responsavel

Consulte GUIA-DA-LOJA.md. Ao reservar ou vender a ultima unidade, coloque estoque 0 no painel; se cancelar a reserva, devolva a unidade. Confira o pagamento antes de enviar. As solicitacoes recebidas por WhatsApp nao aparecem automaticamente na lista de pedidos do painel.
