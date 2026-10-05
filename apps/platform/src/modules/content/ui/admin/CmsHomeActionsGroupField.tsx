"use client";

import type { GroupFieldClientProps } from "payload";

import { HomeActions } from "../public/HomeActions";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { homeActionsEditor } from "./HomeActionsEditorNavigation";
import { useHomeActionsPreview } from "./useHomeActionsPreview";

export default function CmsHomeActionsGroupField(props: GroupFieldClientProps) {
  const content = useHomeActionsPreview();

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={homeActionsEditor}
      description="Edit the titles and descriptions of the three cards beneath the Home Page Banner."
      previewLabel="Live action cards preview"
    >
      <HomeActions content={content} />
    </CmsHomeSectionGroupField>
  );
}
