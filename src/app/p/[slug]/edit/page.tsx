import { redirect } from "next/navigation";

export default async function EditIndex({ params }: PageProps<"/p/[slug]/edit">) {
  const { slug } = await params;
  redirect(`/p/${slug}/edit/basics`);
}
