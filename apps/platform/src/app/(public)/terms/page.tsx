import type { Metadata } from "next";

import { CmsRichText } from "@/components/public/cms-rich-text";
import { ContentBlocks } from "@/components/public/content-blocks";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/content.metadata";
import { getPage } from "@/modules/content/content.queries";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> { const page = await getPage("terms"); return page ? contentMetadata(page) : {}; }

export default async function TermsPage() {
  const page = await getPage("terms");
  if (!page) return null;
  return <><PublicPageHeader eyebrow="Legal" image={page.image} title={page.title} summary={page.summary} /><section className="section"><div className="container max-w-3xl text-base leading-8 text-slate-700">{page.content ? <CmsRichText data={page.content} /> : null}</div></section><ContentBlocks blocks={page.blocks} /></>;
}
