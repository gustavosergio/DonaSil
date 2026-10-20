// ============================================================
// DONA SIL — PAINEL — CAMPOS DE FORMULÁRIO PADRÃO
// ============================================================
// Rótulo + input com a mesma aparência em todo o painel.
//   * prop `erro`  → mensagem de validação abaixo do campo;
//   * prop `dica`  → texto de ajuda acima do campo;
//   * desabilitado → integração futura fica visualmente clara.
// ============================================================

import type { ComponentProps, ReactNode } from "react";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-sand bg-ivory px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none disabled:cursor-not-allowed disabled:bg-sand/50 disabled:text-ink-soft";

const CLASSE_ERRO = "mt-1.5 text-xs text-[#a04b32]";

function Rotulo({ htmlFor, texto, dica }: { htmlFor: string; texto: string; dica?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {texto}
      </label>
      {dica && <p className="mb-2 text-xs leading-5 text-ink-soft">{dica}</p>}
    </>
  );
}

function MensagemErro({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <p id={id} className={CLASSE_ERRO} role="alert">
      {erro}
    </p>
  );
}

export function CampoTexto({
  id,
  rotulo,
  dica,
  erro,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; rotulo: string; dica?: string; erro?: string }) {
  return (
    <div className={className}>
      <Rotulo htmlFor={id} texto={rotulo} dica={dica} />
      <input
        id={id}
        className={CLASSE_CAMPO}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...props}
      />
      <MensagemErro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

export function CampoArea({
  id,
  rotulo,
  dica,
  erro,
  className,
  ...props
}: ComponentProps<"textarea"> & { id: string; rotulo: string; dica?: string; erro?: string }) {
  return (
    <div className={className}>
      <Rotulo htmlFor={id} texto={rotulo} dica={dica} />
      <textarea
        id={id}
        className={`${CLASSE_CAMPO} min-h-24 resize-y`}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...props}
      />
      <MensagemErro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

export function CampoSelect({
  id,
  rotulo,
  dica,
  erro,
  className,
  children,
  ...props
}: ComponentProps<"select"> & {
  id: string;
  rotulo: string;
  dica?: string;
  erro?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Rotulo htmlFor={id} texto={rotulo} dica={dica} />
      <select
        id={id}
        className={CLASSE_CAMPO}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        {...props}
      >
        {children}
      </select>
      <MensagemErro id={`${id}-erro`} erro={erro} />
    </div>
  );
}

export function CampoCheckbox({
  id,
  rotulo,
  dica,
  className,
  ...props
}: ComponentProps<"input"> & { id: string; rotulo: string; dica?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-[#b08d57] disabled:cursor-not-allowed"
          {...props}
        />
        <span>
          <span className="block text-sm font-medium text-ink">{rotulo}</span>
          {dica && <span className="block text-xs leading-5 text-ink-soft">{dica}</span>}
        </span>
      </label>
    </div>
  );
}
