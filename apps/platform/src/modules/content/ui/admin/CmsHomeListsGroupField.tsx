"use client";

import type { GroupFieldClientProps } from "payload";
import { HomeProcess } from "../public/HomeProcess";
import { HomeSupport } from "../public/HomeSupport";
import { HomeImpact } from "../public/HomeImpact";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { homeEditorSections } from "./HomeEditorSections";
import { useHomeListPreview } from "./useHomeListPreview";
import { useHomeImpactPreview } from "./useHomeImpactPreview";

export function CmsHomeProcessGroupField(props: GroupFieldClientProps) {
  const content = useHomeListPreview();
  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={homeEditorSections["how-it-works"]}
      description="Edit the heading, introduction and steps. Add, remove or reorder the cards below."
      previewLabel="Live process preview"
    >
      <HomeProcess content={content} />
    </CmsHomeSectionGroupField>
  );
}

export function CmsHomeSupportGroupField(props: GroupFieldClientProps) {
  const content = useHomeListPreview();
  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={homeEditorSections["who-we-support"]}
      description="Edit the heading, introduction and scrolling support cards. Add, remove or reorder cards below."
      previewLabel="Live support cards preview"
    >
      <HomeSupport content={content} presentation="grid" />
    </CmsHomeSectionGroupField>
  );
}

export function CmsHomeAdditionalGroupField(props: GroupFieldClientProps) {
  const content = useHomeImpactPreview();

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={homeEditorSections["additional-content"]}
      description="Edit the impact banner: heading, introduction, background image, statistics and campaign message."
      previewLabel="Live impact banner preview"
    >
      <HomeImpact content={content} />
    </CmsHomeSectionGroupField>
  );
}
