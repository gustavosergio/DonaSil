# Pasta `supabase/` — banco de dados da Dona Sil

**STATUS: aguardando revisão. NADA disto foi aplicado ao banco ainda.**

## O que tem aqui

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Cria as tabelas (estrutura) e os índices |
| `politicas-rls.sql` | Segurança: quem pode ler e escrever cada tabela + bucket de fotos |
| `funcoes-estoque.sql` | Criar pedido, cancelar pedido, expirar pendentes (à prova de erro) |
| `seed-demo.sql` | 20 produtos fictícios + frete demo + `compras_ativas = false` |

## Ordem de aplicação (somente após sua autorização)

1. `schema.sql`
2. `politicas-rls.sql`
3. `funcoes-estoque.sql`
4. `seed-demo.sql`

Cada arquivo roda no **Supabase → SQL Editor** (colar → Run), um por vez,
na ordem acima. Depois de cada arquivo, a bateria de testes confirma que
está tudo certo antes de seguir.

---

## Tradução das regras de segurança (português simples)

**Visitante sem login (`anon`):**
- PODE: ler categorias, produtos, variações (estoque), faixas de frete
  e ver as fotos do catálogo.
- NÃO PODE: mais nada. Escrever qualquer coisa = bloqueado.
  Ver pedidos = bloqueado.

**Usuário logado comum (`authenticated`, fora da lista de admins):**
- PODE: a mesma leitura do visitante. Só isso.
- NÃO PODE: escrever em lugar nenhum (veria zero linhas),
  ver pedidos (veria zero linhas), subir fotos.
- Ou seja: "estar logado" não dá poder nenhum.

**Admin (logado E listado na tabela `admin_usuarios`):**
- PODE: criar/editar/apagar produtos, variações, categorias e faixas
  de frete; ler e atualizar configurações; ler todos os pedidos;
  enviar, substituir e apagar fotos no bucket `fotos-produtos`.
- Quem entra nessa lista: só você, cadastrada na Etapa 3, via SQL
  (com a chave secreta, que só existe no servidor).

**Servidor do site (chave secreta `sb_secret_`):**
- É o único que cria, cancela e expira pedidos, através das funções
  `criar_pedido`, `cancelar_pedido` e `expirar_pedidos_pendentes`.
- O navegador NÃO consegue executar essas funções (permissão revogada).

**Travas do banco contra erros e golpes:**
- Estoque nunca fica negativo (`check (quantidade >= 0)` + débito
  condicional).
- Preço e frete vêm SEMPRE do banco, nunca do navegador.
- Compra repetida com a mesma chave devolve o MESMO pedido
  (idempotência) — não debita estoque duas vezes.
- Cancelar duas vezes devolve estoque UMA vez (trava `estoque_devolvido`).
- `compras_ativas = false` enquanto o site é demo: o servidor recusa
  qualquer pedido, mesmo que alguém tente furar o site.
- Pedidos antigos pendentes (48h+) expiram e devolvem o estoque.

---

## Bateria de testes (roda APÓS aplicar, ANTES da Etapa 4)

Cada teste tem resultado esperado. Se algum falhar, paramos e corrigimos.

| # | Teste | Esperado |
|---|---|---|
| 1 | Ler `/rest/v1/produtos` com chave publicável (sem login) | 200 + lista de produtos demo |
| 2 | Tentar `INSERT` em produtos pela API sem login | Erro 401/403 — bloqueado |
| 3 | Usuário logado comum tenta `UPDATE` em produtos | 0 linhas afetadas — nada muda |
| 4 | Usuário logado comum tenta ler `pedidos` | Lista vazia — zero pedidos visíveis |
| 5 | `criar_pedido` com `compras_ativas=false` | Erro `COMPRAS_DESATIVADAS` |
| 6 | Ativar `compras_ativas`, criar pedido com 2 itens | Pedido criado + estoque debitado exato |
| 7 | Mesma chave de idempotência, 2 chamadas | Mesmo pedido retornado, estoque debitado 1x |
| 8 | Variação com estoque 1: 1º pedido passa, 2º falha | 2º recebe `ESTOQUE_INSUFICIENTE` |
| 9 | Cancelar pedido, depois cancelar de novo | 1º devolve estoque, 2º responde `JA_PROCESSADO`, estoque não muda |
| 10 | Pedido "velho" (criado_em -49h) + rodar expiração | Status vira `expirada`, estoque devolvido; rodar de novo = 0 |
| 11 | Chamar `criar_pedido` pela API pública (rpc) | Erro — função não é executável pelo navegador |
| 12 | Desativar `compras_ativas` de volta | Demo reativado — servidor volta a recusar compras |

No fim da bateria, o banco volta ao estado demo (`compras_ativas = false`).
