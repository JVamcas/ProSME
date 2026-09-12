import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { CmsRichText } from "@/components/public/cms-rich-text";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { getListingItem } from "@/modules/content/content.queries";
import { contentMetadata } from "@/modules/content/content.metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await getListingItem("events", (await params).slug);
  return item ? contentMetadata(item) : {};
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getListingItem("events", (await params).slug);
  if (!item?.body) notFound();
  return <><PublicPageHeader eyebrow="Event" image={item.image} title={item.title} summary={item.summary} /><article className="section"><div className="container max-w-3xl"><p className="mb-6 rounded-xl bg-orange-pale p-4 text-sm font-semibold text-navy">{item.location}{item.date ? ` · ${new Intl.DateTimeFormat("en-NA", { dateStyle: "long", timeStyle: "short" }).format(new Date(item.date))}` : ""}</p><CmsRichText data={item.body} />{item.href ? <Link className="home-primary mt-8" href={item.href}>Register for this event</Link> : null}</div></article></>;
}
