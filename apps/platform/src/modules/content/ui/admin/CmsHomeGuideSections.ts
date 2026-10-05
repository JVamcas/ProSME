import type { Homepage } from "@/payload-types";

import { homeBannerEditor } from "./HomeBannerEditorNavigation";

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
  ];
}
