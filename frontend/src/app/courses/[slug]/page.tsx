import { permanentRedirect } from "next/navigation";

export default async function CourseAliasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/en/courses/${slug}`);
}
