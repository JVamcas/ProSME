import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsRichText } from "@/components/public/cms-rich-text";
import { ContentBlocks } from "@/components/public/content-blocks";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/content.metadata";
import { getPage } from "@/modules/content/content.queries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const page = await getPage("about"); return page ? contentMetadata(page) : {}; }

export default async function AboutPage() {
  const page = await getPage("about");
  if (!page) notFound();
  return <><PublicPageHeader eyebrow="About us" image={page.image} title={page.title} summary={page.summary} /><section className="section bg-white"><div className="container max-w-3xl text-lg leading-8 text-slate-700">{page.content ? <CmsRichText data={page.content} /> : null}</div></section><ContentBlocks blocks={page.blocks} /></>;
}
