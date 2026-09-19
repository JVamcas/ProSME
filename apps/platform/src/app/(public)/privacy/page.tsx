import type { Metadata } from "next";

import { CmsRichText } from "@/components/ui/cms-rich-text";
import { ContentBlocks } from "@/components/public/content-blocks";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";


export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("privacy");
  return page ? contentMetadata(page) : {};
}

export default async function PrivacyPage() {
  const page = await getPage("privacy");
  if (!page) return null;
  return (
    <>
      <PublicPageHeader
        eyebrow="Legal"
        image={page.image}
        title={page.title}
        summary={page.summary}
      />
      <section className="section">
        <div className="container max-w-3xl text-base leading-8 text-slate-700">
          {page.content ? <CmsRichText data={page.content} /> : null}
        </div>
      </section>
      <ContentBlocks blocks={page.blocks} />
    </>
  );
}
