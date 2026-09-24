import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsRichText } from "@/components/ui/cms-rich-text";
import { ContentBlocks } from "@/components/public/content-blocks";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";



export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("how-to-apply");
  return page ? contentMetadata(page) : {};
}

export default async function HowToApplyPage() {
  const page = await getPage("how-to-apply");
  if (!page) notFound();
  return <><PublicPageHeader eyebrow="A guided application" image={page.image} title={page.title} summary={page.summary} /><section className="section"><div className="container max-w-3xl">{page.content ? <CmsRichText data={page.content} /> : null}</div></section><ContentBlocks blocks={page.blocks} /></>;
}
