import { HomeHero } from "@/components/public/home-hero";
import { HomeActions } from "@/components/public/home-actions";
import { HomeFundingCall } from "@/modules/funding-calls/ui/public/HomeFundingCall";
import { HomeProcess } from "@/components/public/home-process";
import { HomeSupport } from "@/components/public/home-support";
import { ContentBlocks } from "@/components/public/content-blocks";
import {
  getEligibilityContent,
  getHomepage,
} from "@/modules/content/ServerContentQueries";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

export default async function HomePage() {

  const [homepage, fundingCalls, eligibility] = await Promise.all([
    getHomepage(),
    listPublicFundingCalls({ limit: 1 }),
    getEligibilityContent(),
  ]);
  const newsBlocks = homepage.blocks.filter(isResourceGrid);
  const remainingBlocks = homepage.blocks.filter(
    (block) => !isResourceGrid(block) && !isPrepareCta(block),
  );
  return (
    <>
      <HomeHero content={homepage} />
      <HomeActions />
      <HomeFundingCall call={fundingCalls.items[0]} />
      <ContentBlocks blocks={newsBlocks} />
      <HomeProcess />
      <HomeSupport items={eligibility} />
      <ContentBlocks blocks={remainingBlocks} />
    </>
  );
}

function isResourceGrid(block: unknown) {
  return Boolean(
    block &&
    typeof block === "object" &&
    "blockType" in block &&
    block.blockType === "resourceGrid",
  );
}

function isPrepareCta(block: unknown) {
  return Boolean(
    block &&
    typeof block === "object" &&
    "blockType" in block &&
    block.blockType === "callToAction" &&
    "href" in block &&
    block.href === "/how-to-apply",
  );
}
