// ============================================================
// DONA SIL — PAINEL — ÍCONES (SVG inline, sem dependências)
// ============================================================
// Todos seguem o traço fino do site público (stroke 1.8) e
// recebem `className` para definir o tamanho onde forem usados.
// ============================================================

type PropsIcone = { className?: string };

function Svg({ className, children }: PropsIcone & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconeCasa({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
    </Svg>
  );
}

export function IconeTag({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M3 11.5V4a1 1 0 0 1 1-1h7.5L21 12.5 12.5 21 3 11.5Z" />
      <circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconeMarcador({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
    </Svg>
  );
}

export function IconePaleta({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.3.3-2.5 1.8-2.5H18a3 3 0 0 0 3-3c0-5.5-4-10.5-9-10.5Z" />
      <circle cx="7.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconeSacola({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M6 8h12l1 13H5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function IconeEngrenagem({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </Svg>
  );
}

export function IconeMenu({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconeFechar({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconeBusca({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </Svg>
  );
}

export function IconeMais({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconeCheck({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="m5 13 4 4L19 7" />
    </Svg>
  );
}

export function IconeOlho({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconeLapis({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
      <path d="m14.5 5.5 4 4" />
    </Svg>
  );
}

export function IconeSetaEsquerda({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Svg>
  );
}

export function IconeAviso({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconeCaixa({ className }: PropsIcone) {
  return (
    <Svg className={className}>
      <path d="M3 8 12 3l9 5v8l-9 5-9-5V8Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </Svg>
  );
}
