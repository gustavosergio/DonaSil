# Pasta `supabase/` — banco de dados da Dona Sil

**STATUS: revisão 3 (auditoria final pré-push). NADA aplicado ao banco de produção.**

## O que tem aqui

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Cria as 8 tabelas + índices. Reaplicável (`if not exists`) |
| `politicas-rls.sql` | Segurança: RLS + permissões por papel + bucket de fotos. Reaplicável (`drop policy if exists`) |
| `funcoes-estoque.sql` | `criar_pedido`, `cancelar_pedido`, `expirar_pedidos_pendentes` + permissões EXECUTE. Reaplicável (`create or replace`) |
| `seed-demo.sql` | 20 produtos fictícios (`demo=true`) + frete demo + `compras_ativas=false`. Reaplicável (`on conflict do nothing`) |

## Ordem de aplicação (somente após sua autorização)

1. `schema.sql`
2. `politicas-rls.sql`
3. `funcoes-estoque.sql`
4. `seed-demo.sql`

Cada arquivo roda no **Supabase → SQL Editor** (colar → Run), um por vez, na ordem acima. Os quatro podem rodar de novo mais tarde sem erro e sem duplicar dados.

---

## Segurança em português simples (após revisão)

**Visitante sem login (`anon`):**
- PODE: ler categorias, produtos, variações (estoque), faixas de frete e ver fotos do bucket.
- NÃO PODE: escrever qualquer coisa (permissão revogada), ver pedidos (permissão revogada), executar qualquer função do estoque.

**Usuário logado comum (`authenticated`, fora da lista de admins):**
- PODE: a mesma leitura do visitante. Só isso.
- NÃO PODE: escrever em nenhum lugar (política exige `existe_admin()` → zero linhas), ver pedidos/configurações (zero linhas), subir fotos (RLS do storage bloqueia), executar funções do estoque (permissão revogada).
- Ou seja: "estar logado" não dá poder nenhum.

**Admin (logado E na tabela `admin_usuarios`):**
- PODE: criar/editar/apagar produtos, variações, categorias e fretes; ler pedidos e configurações; atualizar configurações; enviar/substituir/apagar fotos no bucket `fotos-produtos`.
- NÃO PODE pela API: alterar pedidos direto (nem o admin tem `UPDATE` na tabela de pedidos — cancelar/expirar passam só pelas funções, no servidor).

**Servidor do site (`service_role`, chave secreta `sb_secret_`):**
- ÚNICO papel que executa `criar_pedido`, `cancelar_pedido`, `expirar_pedidos_pendentes`.
- `anon` e `authenticated` têm EXECUTE revogado — nem chegam a tentar.
- No Supabase, `service_role` ignora RLS e mantém os privilégios padrão; nosso script não mexe neles.

**Travas do banco contra erros e golpes:**
- Estoque nunca fica negativo (`check` + débito condicional).
- Preço e frete vêm SEMPRE do banco; navegador envia só `(variacao_id, quantidade)`.
- Produto inativo ou `demo=true` é recusado MESMO com `compras_ativas=true`.
- Mesma chave de idempotência = mesmo pedido; chamadas simultâneas com a mesma chave são serializadas por trava de advisory lock — a segunda recebe o pedido da primeira, sem erro e sem débito duplo.
- Itens repetidos no carrinho são somados (unificados por variação) antes de debitar.
- Cancelar/expirar devolvem estoque UMA vez (`estoque_devolvido`), sempre SOMANDO as linhas por variação.
- Limites: 20 itens por carrinho, 10 unidades por item — por linha E na soma das linhas repetidas da mesma variação (validado antes de qualquer débito); frete obrigatório e validado; dados da cliente validados (tamanhos, UF com 2 letras).
- `compras_ativas=false`: servidor recusa qualquer pedido.
- Tabelas criadas DEPOIS do `politicas-rls.sql` nascem SEM permissões para `anon`/`authenticated` (`alter default privileges`) — uma tabela nova esquecida não fica aberta por engano.
- `existe_admin()` roda como dona (SECURITY DEFINER) com `search_path` vazio e tudo qualificado — sem risco de sequestro.

**Formato da configuração:** o valor é o dado direto (`'false'::jsonb`), não um objeto. As funções leem com `(valor #>> '{}')::boolean`.

---

## Testes EXECUTADOS de verdade (Postgres 17 local, cópia de teste)

Rodados em container Docker com uma réplica mínima do ambiente Supabase
(papéis `anon`/`authenticated`/`service_role`, schemas `auth` e `storage`
simulados, privilégios padrão reproduzidos). **Zero contato com o banco de você.**

| # | Teste | Resultado |
|---|---|---|
| t01 | Seed: 5 categorias, 20 produtos, 86 variações, 3 fretes, `compras_ativas=false` | ✅ PASS |
| t01b | Kimono Palace todo esgotado (estoque 0) | ✅ PASS |
| t01c | Variação individual com 0 (Florida P Off-white) | ✅ PASS |
| t02 | `anon` lê catálogo inteiro (20/86/3) + fotos do bucket | ✅ PASS |
| t03 | `anon` tenta escrever produto | ✅ `permission denied` |
| t04 | `anon` tenta ler pedidos | ✅ `permission denied` |
| t04b | `anon` tenta executar `criar_pedido` | ✅ `permission denied for function` |
| t05 | Usuário comum logado: `existe_admin()` = falso | ✅ PASS |
| t05b | Comum tenta derrubar preço → `UPDATE 0`, preço intacto | ✅ PASS |
| t05c | Comum tenta apagar estoque → `DELETE 0` | ✅ PASS |
| t05d/e | Comum lê pedidos e configurações → zero linhas | ✅ PASS |
| t06/t06b | Comum tenta as 3 funções do estoque | ✅ `permission denied` nas 3 |
| t07 | Admin: escreve catálogo + sobe/apaga foto no bucket | ✅ PASS |
| t08 | Comum tenta subir foto no bucket | ✅ violação de RLS |
| t09 | Compras desativadas → `COMPRAS_DESATIVADAS` | ✅ PASS |
| t10 | Pedido básico: código `DS-…`, subtotal 200 + frete 15 = total 215, estoque 5→3 | ✅ PASS |
| t11 | Mesma chave 2ª vez: `ja_existia=true`, mesmo código, 1 pedido, estoque intacto | ✅ PASS |
| t12 | Produto **demo** recusado com compras ativas | ✅ `PRODUTO_INDISPONIVEL` |
| t13 | Produto **inativo** recusado | ✅ `PRODUTO_INDISPONIVEL` |
| t14/t14b | Frete inexistente / sem ID | ✅ `FRETE_INVALIDO` / `DADOS_INVALIDOS` |
| t15/t15b/t15c | Quantidade 11 / variacao_id inválida / 21 itens | ✅ `DADOS_INVALIDOS` |
| t16 | Pede 5 com estoque 3 → rollback total, estoque intacto | ✅ `ESTOQUE_INSUFICIENTE` |
| t17 | Carrinho com item repetido: unificado em 1 linha (qtd 3), débito único | ✅ PASS |
| t17b | **Duas linhas da mesma variação com 10+10** → recusado; estoque intacto; zero pedido novo (rollback total) | ✅ `DADOS_INVALIDOS: soma…` |
| t17c | **Combinação válida de linhas repetidas** (2+1 = 3) → pedido criado, 1 linha qtd 3, débito único | ✅ PASS |
| t17d | 10+10 em variação com estoque GRANDE (20) → ainda recusado: **limite aplicado antes de qualquer débito** | ✅ PASS |
| t17e | Soma exatamente no limite (5+5 = 10) → aceito (fronteira inclusiva), 1 linha qtd 10 | ✅ PASS |
| t17f | Soma 11 (6+5) → recusado, estoque e pedidos intactos | ✅ PASS |
| t18 | Zero estoques negativos no fim | ✅ PASS |
| t19 | Cancelar pendente: devolve 1x; 2ª chamada `JA_PROCESSADO` | ✅ PASS |
| t20 | Cancelar pedido `enviada` → `STATUS_INVALIDO`, estoque não devolve | ✅ PASS |
| t21 | Expiração 48h: devolve estoque, marca `expirada`; 2ª rodada = 0 | ✅ PASS |
| t22 | Cancelar expirado → `JA_PROCESSADO` (sem devolver 2x) | ✅ PASS |
| t23 | Pedido forjado com 2 linhas da MESMA variação: devolução = SOMA (4+3=7) | ✅ PASS |
| t24 | Cancelar `confirmada` funciona normal | ✅ PASS |
| t19c | **Concorrência última unidade**: A compra (transação aberta 2s), B tentou durante → B recebeu `ESTOQUE_INSUFICIENTE`; 1 pedido só | ✅ PASS |
| t19d/e | **Concorrência mesma chave**: C cria (transação aberta 2s), D simultâneo → D esperou a trava e recebeu o MESMO pedido (`ja_existia=true`), estoque debitado 1x | ✅ PASS |
| t26 | Seed rodado 2ª vez: zero duplicação (demo=20, total=21) | ✅ PASS |
| t27 | Estoque alterado em teste NÃO voltou ao valor do seed | ✅ PASS |
| t28 | Configuração alterada em teste preservada pelo re-seed | ✅ PASS |
| t29 | Políticas re-aplicadas continuam valendo (comum continua bloqueado, admin continua liberado) | ✅ PASS |
| a30/a30b | Tabela NOVA criada depois do arquivo: `anon` e `authenticated` não conseguem nem ler (default privileges revogados) | ✅ `permission denied` |
| a31 | Simulação do padrão da plataforma (default privileges doando ALL a `anon`/`authenticated`/`service_role`): após o script, a ACL de padrões fica SÓ com `service_role`; tabela nova tem grants só para `postgres`+`service_role`; `service_role` continua lendo | ✅ PASS |
| — | Os 4 arquivos re-executados por cima: zero erros | ✅ PASS |

**Auditoria final:** bateria completa re-executada do zero contra a versão
final dos arquivos (revisão 3), em Postgres 17 limpo — todos os testes
acima são desta rodada final.

**Bug real encontrado pela bateria e corrigido:** `criar_pedido` lia a
configuração como se fosse objeto (`valor->>'compras_ativas'`) mas o seed
guarda o valor direto. Falhava fechado (nunca venderia por engano), mas
também não venderia quando ligado. Corrigido para `valor #>> '{}'` e
re-testado (t01, t28b).

**Buraco encontrado na revisão 3 e corrigido:** o limite de 10 unidades era
validado por linha, então duas linhas da mesma variação com 10+10 passavam
e somavam 20 no débito. Agora existe o passo 4b: a soma unificada por
variação também é validada, antes de qualquer débito (t17b–t17f).

**Buraco encontrado na auditoria final e corrigido:** o `REVOKE` de
`politicas-rls.sql` só atingia as tabelas existentes; uma tabela criada
depois nasceria aberta (padrão do Supabase dá `anon`/`authenticated` com
ALL e sem RLS). Corrigido com `ALTER DEFAULT PRIVILEGES … REVOKE ALL`
(a30/a30b).

---

## O que SÓ dá para validar no Supabase real (depois de aplicar)

Estes itens dependem do serviço de verdade e ficam para a validação pós-aplicação:

1. Os 4 arquivos compilarem no SQL Editor do Supabase (versão lá pode diferir da local).
2. `auth.uid()` com JWT real — no teste local foi simulado.
3. Camada REST (PostgREST): formato exato dos erros 401/403 e bloqueio de `/rpc/criar_pedido` para chaves publicáveis.
4. Storage real: criação do bucket, URL pública das fotos, políticas sobre o `storage.objects` de verdade (com colunas e triggers reais).
5. Privilégios padrão reais do Supabase: confirmar que o REVOKE remove o acesso de `anon`/`authenticated` lá também. O `ALTER DEFAULT PRIVILEGES` vale para objetos criados pelo MESMO papel que rodou o script — a documentação do Supabase diz que o SQL Editor roda como `postgres`, mas isso NÃO foi verificado no ambiente real (teste 7 abaixo).
6. Table Editor do painel: não sabemos se ele cria tabelas como `postgres` (protegidas) ou como outro papel (nesse caso as tabelas criadas pelo painel NÃO ficam cobertas — aplicar na mão: `enable row level security` + `revoke` + grants mínimos). Também não verificado no ambiente real (teste 7 abaixo).
7. Painel: produto `demo` não pode ser comprado; `compras_ativas` visível no admin (Etapa 8).

## Bateria no Supabase (roteiro resumido, após aplicação)

1. `GET /rest/v1/produtos` com chave publicável → 200 com 20 produtos.
2. `POST /rest/v1/produtos` sem login → 401/403.
3. `POST /rpc/criar_pedido` com chave publicável → bloqueado.
4. SQL Editor: repetir t10–t24 com um produto QA criado na hora (`demo=false`).
5. Criar pedido de teste, envelhecer 49h, rodar `expirar_pedidos_pendentes()` → confere.
6. Voltar `compras_ativas` para `false` e apagar o produto QA.
7. Teste da tabela futura (valida o `ALTER DEFAULT PRIVILEGES`), no SQL Editor:

   ```sql
   create table public.teste_tabela_futura (id int);

   select grantee, privilege_type
   from information_schema.role_table_grants
   where table_name = 'teste_tabela_futura'
   order by grantee, privilege_type;
   -- Esperado: só POSTGRES e SERVICE_ROLE. NENHUM anon/authenticated.

   drop table public.teste_tabela_futura;
   ```

   Depois, fora do painel, `GET /rest/v1/teste_tabela_futura` com a chave
   publicável → esperado 404/403, nunca 200 com dados.
   E ainda: criar uma tabela pelo **Table Editor** do painel e repetir a
   consulta acima (trocar o `table_name`). Se aparecerem `anon`/`authenticated`,
   o painel cria com outro papel — nesse caso toda tabela do painel precisa
   de proteção na mão: `alter table X enable row level security;` +
   `revoke all on public.X from anon, authenticated;` + grants mínimos.

## Produto de teste QA (usar na validação no Supabase)

Produtos do seed são todos `demo=true` e NÃO podem ser comprados. Para
testar compras de verdade depois de aplicar, crie um produto assim
(SQL Editor) e apague no final:

```sql
insert into public.produtos (slug, nome, descricao, preco, categoria_id, ativo, demo)
select 'produto-teste-qa', 'Produto Teste QA', 'validacao', 100.00, c.id, true, false
from public.categorias c where c.slug = 'vestidos';

insert into public.variacoes (produto_id, tamanho, cor, cor_hex, quantidade)
select p.id, 'P', 'Azul', '#0000ff', 5
from public.produtos p where p.slug = 'produto-teste-qa';

-- ... rode os testes de compra com ele ...

-- limpeza no final:
-- delete from public.produtos where slug = 'produto-teste-qa';
-- update public.configuracoes set valor = 'false'::jsonb where chave = 'compras_ativas';
```

## Reaplicação (por que é seguro rodar de novo)

- `schema.sql`: tudo `if not exists` → só notices.
- `politicas-rls.sql`: `drop policy if exists` antes de cada `create policy`; RLS e grants repetidos não fazem mal.
- `funcoes-estoque.sql`: `create or replace`; revokes/grants são idempotentes.
- `seed-demo.sql`: `on conflict do nothing` → ignora o que já existe e NÃO mexe em estoque/config já alterados.
