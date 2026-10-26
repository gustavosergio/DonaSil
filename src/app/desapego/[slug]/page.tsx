import PaginaPeca, { metadadosPeca } from "@/components/PaginaPeca";

type Props = PageProps<"/desapego/[slug]">;

export async function generateMetadata(props: Props) {
  return metadadosPeca({ params: props.params, secao: "desapego" });
}

export default function PaginaProduto(props: Props) {
  return <PaginaPeca params={props.params} secao="desapego" />;
}
