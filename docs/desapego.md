# Desapego

A seção `/desapego` usa a categoria de slug `desapego`, com visual verde e pêssego. Seus anúncios ficam separados do catálogo de moda, das categorias da página inicial e dos destaques de roupas.

## Cadastrar um objeto

1. No painel, abra **Produtos → Cadastrar produto** e escolha **Desapego**.
2. Preencha nome e preço. Na descrição, informe estado de conservação, marcas de uso, medidas, voltagem e acessórios, quando aplicável.
3. A categoria prepara cor **Única**, tamanho **Único** e estoque **1** quando o cadastro ainda está vazio. Confira esses campos antes de salvar.
4. Salve e adicione as fotos reais na edição do produto. Use **Ver na loja** para conferir o anúncio.
5. Ao vender o objeto, zere seu estoque ou coloque o anúncio como rascunho.

Os objetos são negociados pelo WhatsApp oficial já configurado na loja. O preço no cartão inclui o acréscimo de 15% definido pela responsável. Transporte ou retirada são combinados no atendimento; os itens de Desapego não usam a finalização com o frete de roupas. Essa separação também é validada no servidor.

Nenhum anúncio fictício é criado no banco real. Sem objetos cadastrados, a seção mostra um aviso de que os próximos desapegos estão chegando. Para outro banco, `supabase/categoria-desapego.sql` cadastra a categoria sem duplicá-la.
