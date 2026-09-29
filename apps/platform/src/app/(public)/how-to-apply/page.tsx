import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CmsRichText } from "@/components/ui/cms-rich-text";
import { ContentBlocks } from "@/components/public/content-blocks";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { contentMetadata } from "@/modules/content/ContentMetadata";
import { getPage } from "@/modules/content/ServerContentQueries";
import { GeneralButtonLink } from "@/components/ui/button";
import { ApplicantJourney } from "@/modules/content/ui/public/ApplicantJourney";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("how-to-apply");
  return page ? contentMetadata(page) : {};
}

export default async function HowToApplyPage() {
  const page = await getPage("how-to-apply");
  if (!page) notFound();
  return (
    <>
      <HowToApplyNavigation active="guide" />
      <PublicPageHeader
        eyebrow="A guided application"
        image={page.image}
        title={page.title}
        summary={page.summary}
      />
      <section className="container py-10">
        <div className="max-w-3xl">
          <ApplicantJourney step={1} />
          <GeneralButtonLink
            className="mb-8 min-h-11 rounded-lg"
            href="/how-to-apply/funding"
          >
            Explore funding calls
          </GeneralButtonLink>
          {page.content ? <CmsRichText data={page.content} /> : null}
        </div>
      </section>
      <ContentBlocks blocks={page.blocks} />
    </>
  );
}
