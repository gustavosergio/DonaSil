# Cotação de frete para outras cidades

## Estado da integração

Código preparado para cotar PAC/SEDEX pela API do Melhor Envio. A cotação real depende da conta da loja, credencial autorizada e peso/dimensões reais. Enquanto a configuração estiver incompleta, a tela avisa que a consulta está em preparação; nenhum valor é inventado e pedidos abaixo do limite de gratuidade não são finalizados com frete zero.

Recife: Zona Norte R$ 14,99 e Zona Sul R$ 21,99. Retirada gratuita. Mantida a promoção: subtotal dos produtos estritamente acima de R$ 129,99 tem frete grátis, também para outras cidades. O acréscimo de cartão não conta para atingir a promoção.

## Configuração no servidor

Configure na Cloudflare, somente no ambiente do Worker:

- `MELHOR_ENVIO_TOKEN`: credencial da conta de produção com permissão de cotação. Não usar token sandbox na loja real.
- `MELHOR_ENVIO_CONTATO`: e-mail de suporte usado no User-Agent exigido pela API.
- `FRETE_CEP_ORIGEM`: CEP de onde as peças serão postadas.
- `FRETE_PESO_PECA_KG`: peso de uma peça embalada, em kg.
- `FRETE_ALTURA_PECA_CM`, `FRETE_LARGURA_PECA_CM`, `FRETE_COMPRIMENTO_PECA_CM`: dimensões reais de uma peça embalada, em cm.

Esse padrão único só deve ser ativado se for adequado a todas as peças enviadas. Peças com embalagens muito diferentes precisam de medidas por produto antes de usar a cotação. Não preencher medidas presumidas. A quantidade e o valor segurado vêm do catálogo revalidado, nunca dos preços guardados no navegador.

Armazene o token como secret do Worker, nunca em `wrangler.jsonc`, GitHub ou variável NEXT_PUBLIC. Atualize ou renove a credencial antes do vencimento informado pelo Melhor Envio. A falta de credencial válida bloqueia a cotação; não utiliza uma tabela aproximada como substituição. O fluxo não compra etiquetas, não adiciona saldo e não realiza pagamentos.

## Conferência

O servidor consulta o preço atualizado novamente ao confirmar o pedido. Se o serviço sair do ar, ficar indisponível ou o preço mudar, exige nova cotação. São utilizados `custom_price` e `custom_delivery_time`. Somente CEPs, medidas, quantidade e valor segurado são enviados para cotar; nome, telefone e rua da cliente não são enviados ao provedor.

Documentação oficial: https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos

## Endereço por CEP

Rua e número têm campos separados. Rua, bairro, cidade e UF ficam somente leitura e o servidor confere o endereço na ViaCEP. CEP genérico sem rua/bairro completos pede um CEP específico ou atendimento. Trocar o CEP limpa os dados anteriores e invalida a cotação. O número pode conter `S/N`; complemento é opcional.
