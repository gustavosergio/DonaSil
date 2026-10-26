import PaginaPeca, { metadadosPeca } from "@/components/PaginaPeca";

type Props = PageProps<"/catalogo/[slug]">;

export async function generateMetadata(props: Props) {
  return metadadosPeca({ params: props.params, secao: "moda" });
}

export default function PaginaProduto(props: Props) {
  return <PaginaPeca params={props.params} secao="moda" />;
}
