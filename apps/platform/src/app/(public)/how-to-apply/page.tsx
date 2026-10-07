import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicationGuideContent } from "@/modules/content/ui/public/ApplicationGuideContent";
import { ContentBlocks } from "@/modules/content/ui/public/ContentBlocks";
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
      <ApplicationGuideContent page={page}>
        <ApplicantJourney step={1} />
        <GeneralButtonLink
          className="mb-8 min-h-11 rounded-lg"
          href="/how-to-apply/funding"
        >
          Explore funding calls
        </GeneralButtonLink>
      </ApplicationGuideContent>
      <ContentBlocks blocks={page.blocks} />
    </>
  );
}
