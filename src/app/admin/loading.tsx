// ============================================================
// DONA SIL — PAINEL — CARREGANDO
// ============================================================
// Esqueleto exibido enquanto a seção carrega (navegação entre
// páginas e dados vindo do banco).
// ============================================================

export default function CarregandoPainel() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-9 w-56 rounded-full bg-champagne" />
      <div className="mt-3 h-4 w-full max-w-md rounded-full bg-champagne" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-champagne" />
        <div className="h-28 rounded-2xl bg-champagne" />
        <div className="h-28 rounded-2xl bg-champagne" />
      </div>
      <div className="mt-8 h-64 rounded-2xl bg-champagne" />
    </div>
  );
}
