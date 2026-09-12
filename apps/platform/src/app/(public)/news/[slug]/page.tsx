import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsRichText } from "@/components/public/cms-rich-text";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getListingItem } from "@/modules/content/content.queries";
import { contentMetadata } from "@/modules/content/content.metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getListingItem("news", (await params).slug);
  return item ? contentMetadata(item) : {};
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getListingItem("news", (await params).slug);
  if (!item?.body) notFound();
  return <><PublicPageHeader eyebrow="News" image={item.image} title={item.title} summary={item.summary} /><article className="section"><div className="container max-w-3xl"><CmsRichText data={item.body} /></div></article></>;
}
