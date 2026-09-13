import { HomeHero } from "@/components/public/home-hero";
import { HomeActions } from "@/components/public/home-actions";
import { HomeFundingCall } from "@/components/public/home-funding-call";
import { HomeProcess } from "@/components/public/home-process";
import { HomeSupport } from "@/components/public/home-support";
import { ContentBlocks } from "@/components/public/content-blocks";
import {
  getEligibilityContent,
  getFundingCalls,
  getHomepage,
} from "@/modules/content/ServerContentQueries";

export default async function HomePage() {

  const [homepage, fundingCalls, eligibility] = await Promise.all([
    getHomepage(),
    getFundingCalls(),
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
      <HomeFundingCall call={fundingCalls[0]} />
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
