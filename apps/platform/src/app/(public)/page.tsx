import { getPublicPageVisibility } from "@/modules/content/application/ServerPublicPageVisibilityService";
import { isPublicPathVisible } from "@/modules/content/domain/PublicPageVisibility";
import { PublicVisibility } from "@/modules/content/ui/public/PublicVisibility";
import { HomeHero } from "@/modules/content/ui/public/HomeHero";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HomeActions } from "@/modules/content/ui/public/HomeActions";
import { HomeFundingCall } from "@/modules/funding-calls/ui/public/HomeFundingCall";
import { HomeProcess } from "@/modules/content/ui/public/HomeProcess";
import { HomeSupport } from "@/modules/content/ui/public/HomeSupport";
import { ContentBlocks } from "@/modules/content/ui/public/ContentBlocks";
import { getHomepage } from "@/modules/content/ServerContentQueries";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

export default async function HomePage() {
  const preview = (await draftMode()).isEnabled;
  const [homepage, fundingCalls, visibility] = await Promise.all([
    getHomepage(),

    listPublicFundingCalls({ limit: 2, status: "open" }),
    getPublicPageVisibility(),
  ]);
  if (!homepage) notFound();
  const newsBlocks = homepage.blocks.filter(isResourceGrid);
  const remainingBlocks = homepage.blocks.filter(
    (block) => !isResourceGrid(block),
  );
  return (
    <>
      {preview ? (
        <div className="bg-brand-navy px-4 py-3 text-center text-sm font-semibold text-white">
          Draft preview ·{" "}
          <Link className="underline" href="/api/preview/exit">
            Exit preview
          </Link>
        </div>
      ) : null}
      <PublicVisibility pageKey="home.banner">
        <HomeHero
          content={homepage}
          showFundingLink={isPublicPathVisible(visibility, "/funding")}
        />
      </PublicVisibility>
      <PublicVisibility pageKey="home.action-cards">
        <HomeActions content={homepage} visibility={visibility} />
      </PublicVisibility>
      <PublicVisibility pageKey="funding">
        <HomeFundingCall
          call={fundingCalls.items[0]}
          showViewAll={fundingCalls.total > 1}
          slogan={homepage.fundingSlogan}
        />
      </PublicVisibility>
      <PublicVisibility pageKey="home.additional-content">
        <ContentBlocks
          blocks={newsBlocks}
          resourceIntroduction={homepage.newsIntroduction}
        />
      </PublicVisibility>
      <PublicVisibility pageKey="home.how-it-works">
        <HomeProcess content={homepage} />
      </PublicVisibility>
      <PublicVisibility pageKey="home.who-we-support">
        <HomeSupport
          content={homepage}
          showEligibilityLink={isPublicPathVisible(visibility, "/eligibility")}
        />
      </PublicVisibility>
      <PublicVisibility pageKey="home.additional-content">
        <ContentBlocks blocks={remainingBlocks} />
      </PublicVisibility>
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
