"use client";

import type { GroupFieldClientProps } from "payload";

import { HomeHero } from "../public/HomeHero";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { homeBannerEditor } from "./HomeBannerEditorNavigation";
import { useHomeBannerPreview } from "./useHomeBannerPreview";

export default function CmsHomeBannerGroupField(props: GroupFieldClientProps) {
  const content = useHomeBannerPreview();

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={homeBannerEditor}
      description="Edit the first section visitors see on Home. Save a draft, preview the page, then publish when it is ready."
      previewLabel="Live banner preview"
    >
      <HomeHero content={content} />
    </CmsHomeSectionGroupField>
  );
}
