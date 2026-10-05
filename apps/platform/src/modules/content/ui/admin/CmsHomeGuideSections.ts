import type { Homepage } from "@/payload-types";

import { homeBannerEditor } from "./HomeBannerEditorNavigation";
import { homeActionsEditor } from "./HomeActionsEditorNavigation";
import { homeEditorSections } from "./HomeEditorSections";
import { defaultHomeActionCards } from "../../ContentDefaults";

export type GuideSection = {
  title: string;
  preview: string;
  target?: string;
  detail?: string;
  image?: string;
};

export function buildHomeGuideSections(
  home: Homepage,
  canEdit: boolean,
): GuideSection[] {
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
      title: homeActionsEditor.title,
      preview: [
        home.actionCards?.fundingTitle ?? defaultHomeActionCards.fundingTitle,
        home.actionCards?.eligibilityTitle ??
          defaultHomeActionCards.eligibilityTitle,
        home.actionCards?.trackingTitle ?? defaultHomeActionCards.trackingTitle,
      ].join(" · "),
      detail:
        "The three cards beneath the banner: funding, eligibility and application tracking.",
      target: canEdit ? homeActionsEditor.href : undefined,
    },
    {
      title: homeEditorSections["how-it-works"].title,
      preview: home.process?.heading ?? "How it works",
      detail: `${home.process?.steps?.length ?? 0} steps. Add, remove or reorder process cards.`,
      target: canEdit ? homeEditorSections["how-it-works"].href : undefined,
    },
    {
      title: homeEditorSections["who-we-support"].title,
      preview: home.supportHeading ?? "Who we support",
      detail: `${home.supportCards?.length ?? 0} support cards. Add, remove or reorder the scrolling cards.`,
      target: canEdit ? homeEditorSections["who-we-support"].href : undefined,
    },
    {
      title: homeEditorSections["additional-content"].title,
      preview: `${home.layout?.length ?? 0} content blocks`,
      detail:
        "Manage additional content blocks, the funding slogan and news introduction.",
      target: canEdit
        ? homeEditorSections["additional-content"].href
        : undefined,
    },
  ];
}
