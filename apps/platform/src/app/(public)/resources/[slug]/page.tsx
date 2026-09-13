import { notFound, redirect } from "next/navigation";

import { getResources } from "@/modules/content/ServerContentQueries";

export const dynamic = "force-dynamic";

export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = (await getResources()).find((resource) => resource.slug === slug);
  if (!item) notFound();
  if (item.href) redirect(item.href);
  notFound();
}
