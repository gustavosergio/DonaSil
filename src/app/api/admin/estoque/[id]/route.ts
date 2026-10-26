import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { COOKIE_TOKEN, verificarAdminPainel } from "@/lib/painel-auth";

const quantidadeSchema = z.number().int().min(0).max(1_000_000);
const corpoSchema = z.object({
  quantidade: quantidadeSchema,
  quantidadeAnterior: quantidadeSchema,
});
const respostaSchema = z.array(z.object({ id: z.uuid(), quantidade: quantidadeSchema }));

// Ajuste manual por administradora, com RLS e comparação da quantidade
// anterior no próprio UPDATE. Uma edição simultânea nunca é sobrescrita.
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/estoque/[id]">) {
  const token = request.cookies.get(COOKIE_TOKEN)?.value;
  const erro = (status: number, mensagem: string) => NextResponse.json({ ok: false, mensagem }, { status });
  if (!token) return erro(401, "Entre novamente no painel para ajustar o estoque.");
  const admin = await verificarAdminPainel(token);
  if (admin === "falha") return erro(401, "Não foi possível validar sua sessão. Entre novamente.");
  if (admin !== "admin") return erro(403, "Sua conta não tem acesso de administradora.");
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return erro(400, "A variação informada é inválida.");
  const corpo = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return erro(400, "Informe uma quantidade inteira entre 0 e 1.000.000.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) return erro(500, "O painel não está configurado neste ambiente.");
  const params = new URLSearchParams({
    id: `eq.${id.data}`,
    quantidade: `eq.${corpo.data.quantidadeAnterior}`,
    select: "id,quantidade",
  });
  try {
    const resposta = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/variacoes?${params}`, {
      method: "PATCH",
      headers: {
        apikey: chave, Authorization: `Bearer ${token}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify({ quantidade: corpo.data.quantidade }),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (resposta.status === 401) return erro(401, "Sua sessão expirou. Entre novamente.");
    if (resposta.status === 403) return erro(403, "O banco não autorizou este ajuste de estoque.");
    if (!resposta.ok) return erro(502, "Não foi possível confirmar o ajuste. Recarregue a página antes de tentar novamente.");
    const dados = respostaSchema.safeParse(await resposta.json());
    if (!dados.success) return erro(502, "Resposta inesperada. Recarregue a página para conferir o estoque.");
    if (dados.data.length === 0) return erro(409, "O estoque mudou ou a variação não está mais disponível. Recarregue a página antes de ajustar.");
    if (dados.data.length !== 1 || dados.data[0].id !== id.data || dados.data[0].quantidade !== corpo.data.quantidade) {
      return erro(502, "Não foi possível confirmar o valor salvo. Recarregue a página para conferir.");
    }
    return NextResponse.json({ ok: true, quantidade: dados.data[0].quantidade });
  } catch {
    // A conexão pode cair depois de gravar: nunca afirmar que nada mudou.
    return erro(502, "A conexão foi interrompida. Recarregue a página e confira a quantidade antes de tentar novamente.");
  }
}
