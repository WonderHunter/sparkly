import { redirect } from "next/navigation";

/** Seul guide pour l'instant : celui des agents IA. */
export default function DocsPage() {
  redirect("/docs/agents");
}
