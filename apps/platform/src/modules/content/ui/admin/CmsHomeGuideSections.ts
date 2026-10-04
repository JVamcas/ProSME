import type { Homepage } from "@/payload-types";

import { homeBannerEditor } from "./HomeBannerEditorNavigation";

export type GuideSection = {
  title: string;
  preview: string;
  target?: string;
  secondaryTarget?: string;
  secondaryLabel?: string;
  detail?: string;
  image?: string;
};

function blockSection(
  block: Record<string, unknown>,
  index: number,
): GuideSection | null {
  if (block.blockType === "callToAction" && block.href === "/how-to-apply") {
    return null;
  }

  const names: Record<string, string> = {
    hero: "Additional hero",
    richText: "Additional text",
    callToAction: "Call to action",
    statistics: "Impact",
    resourceGrid: "News and resources",
    faqList: "Frequently asked questions",
  };
  const title = names[String(block.blockType)] ?? "Additional content";
  const heading = typeof block.heading === "string" ? block.heading : title;
  const image = block.backgroundImage ?? block.image;

  return {
    title,
    preview: heading,
    target: `/cms/globals/homepage#field-layout`,
    image:
      image && typeof image === "object" && "url" in image
        ? String(image.url)
        : undefined,
    detail:
      block.blockType === "statistics"
        ? `Homepage layout block ${index + 1}. Its own statistics override published programme statistics; an empty list uses those records.`
        : `Homepage layout block ${index + 1}. Open Layout and select this ${title.toLowerCase()} block.`,
  };
}

export function buildHomeGuideSections(
  home: Homepage,
  canEdit: boolean,
  canEditFundingCall: boolean,
): GuideSection[] {
  const blocks = (home.layout ?? []) as Record<string, unknown>[];
  const resourceBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.blockType === "resourceGrid");
  const remainingBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.blockType !== "resourceGrid");
  return [
    {
      title: homeBannerEditor.title,
      preview: home.title ?? homeBannerEditor.title,
      image:
        typeof home.heroImage === "object" && home.heroImage
          ? (home.heroImage.sizes?.thumbnail?.url ??
            home.heroImage.url ??
            undefined)
          : undefined,
      detail: home.summary ?? "Headline, image, buttons and benefit captions.",
      target: canEdit ? homeBannerEditor.href : undefined,
    },
    {
      title: "Three action cards",
      preview: home.actionCards?.fundingTitle ?? "I want funding",
      detail:
        "Funding, eligibility and application tracking cards. Their destinations are fixed website links.",
      target: canEdit ? "/cms/globals/homepage#field-actionCards" : undefined,
    },
    {
      title: "Featured funding call",
      preview: "Current open funding opportunity",
      detail: "Call details, amounts and dates are managed in operations.",
      target: canEditFundingCall ? "/admin/funding-calls" : undefined,
      secondaryTarget: canEdit
        ? "/cms/globals/homepage#field-fundingSlogan"
        : undefined,
      secondaryLabel: "Edit Home slogan",
    },
    ...resourceBlocks.flatMap(({ block, index }) => {
      const section = blockSection(block, index);
      if (!section) return [];

      return [
        {
          ...section,
          target: canEdit ? section.target : undefined,
          secondaryTarget: canEdit
            ? "/cms/globals/homepage#field-newsIntroduction"
            : undefined,
          detail:
            "Home automatically shows the latest two published news articles and two published resources. Edit individual items in their collections.",
        },
      ];
    }),
    {
      title: "How it works",
      preview: home.process?.heading ?? "How it works",
      detail: home.process?.introduction ?? "Four application steps.",
      target: canEdit ? "/cms/globals/homepage#field-process" : undefined,
    },
    {
      title: "Who we support",
      preview: home.supportHeading ?? "Who we support",
      detail:
        home.supportIntroduction ??
        "Support cards are eligibility content entries.",
      target: canEdit
        ? "/cms/globals/homepage#field-supportHeading"
        : undefined,
    },
    ...remainingBlocks.flatMap(({ block, index }) => {
      const section = blockSection(block, index);
      return section
        ? [{ ...section, target: canEdit ? section.target : undefined }]
        : [];
    }),
  ];
}
