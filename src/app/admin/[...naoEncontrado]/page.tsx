import { notFound } from "next/navigation";

// Mantém endereços inexistentes do painel dentro do layout administrativo.
export default function PaginaInexistentePainel() {
  notFound();
}
