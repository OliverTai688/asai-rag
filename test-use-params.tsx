import { useParams } from "next/navigation";
export function Test() {
  const params = useParams();
  return params.id;
}
