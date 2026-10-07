"use client";

import type { GroupFieldClientProps } from "payload";

import { cmsPageEditors } from "../../CmsPageEditors";
import type { PublicPageContent } from "../../ContentTypes";
import { FaqContent } from "../public/FaqContent";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { CmsFaqQuestionsEditor } from "./CmsFaqQuestionsEditor";
import { useCmsFaqContent } from "./useCmsFaqContent";

export function CmsFaqContentGroupField({
  page,
  fieldProps,
}: {
  page: PublicPageContent;
  fieldProps: GroupFieldClientProps;
}) {
  const content = useCmsFaqContent(true);

  return (
    <>
      <CmsHomeSectionGroupField
        fieldProps={fieldProps}
        editor={cmsPageEditors.faq}
        description="Edit the FAQ banner. Manage the questions and answers below."
        previewLabel="Live FAQ preview"
      >
        <div className="[&>section:first-child]:px-6 sm:[&>section:first-child]:px-8">
          <FaqContent page={page} faqs={content.faqs} />
        </div>
      </CmsHomeSectionGroupField>
      <CmsFaqQuestionsEditor content={content} />
    </>
  );
}
