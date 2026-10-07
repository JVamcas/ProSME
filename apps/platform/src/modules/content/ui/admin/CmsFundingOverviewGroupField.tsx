"use client";

import { GroupField, useEditDepth, useFormFields, useStepNav } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { reduceFieldsToValues } from "payload/shared";
import { useEffect } from "react";

import { cmsFundingHref, cmsPageEditors } from "../../CmsPageEditors";
import { fundingPageSections } from "../../FundingPageContent";
import { eligibilityFocusSection } from "../../EligibilityPageContent";
import { FundingSupport } from "../public/FundingSupport";
import { FundingPriorities } from "../public/FundingPriorities";
import { FocusSectors } from "../public/FocusSectors";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { CmsFundingFocusSectorsEditor } from "./CmsFundingFocusSectorsEditor";
import { useCmsFundingFocusContent } from "./useCmsFundingFocusContent";

export default function CmsFundingOverviewGroupField(props: GroupFieldClientProps) {
  const fields = useFormFields(([state]) => state);
  const values = reduceFieldsToValues(fields, true);
  const slug: unknown = values.slug;
  const focused = slug === "funding" || slug === "eligibility";
  const content = useCmsFundingFocusContent(focused);
  const depth = useEditDepth();
  const { stepNav, setStepNav } = useStepNav();
  const editor = focused ? cmsPageEditors[slug] : undefined;

  useEffect(() => {
    if (depth !== 1 || !editor) return;
    if (
      stepNav.length === 2 &&
      stepNav[0]?.url === cmsFundingHref &&
      stepNav[1]?.url === editor.href
    ) {
      return;
    }
    setStepNav([
      { label: "Funding", url: cmsFundingHref },
      { label: editor.breadcrumb, url: editor.href },
    ]);
  }, [depth, editor, setStepNav, stepNav]);

  if (!editor) return <GroupField {...props} />;
  const blocks = Array.isArray(values.layout) ? values.layout : [];
  const sections = fundingPageSections(blocks);
  const focus = slug === "eligibility" ? eligibilityFocusSection(blocks) : content.focus;

  return (
    <>
      <CmsHomeSectionGroupField
        fieldProps={props}
        editor={editor}
        description={slug === "funding"
          ? "Edit what the fund supports and the priority applicants. Manage focus sectors below."
          : "Edit the focus sectors heading, introduction and notice."}
        previewLabel={slug === "funding" ? "Live funding overview preview" : "Live focus sectors preview"}
      >
        {slug === "funding" ? (
          <>
            <FundingSupport content={sections.support} />
            <FundingPriorities content={sections.priorities} />
          </>
        ) : null}
        <FocusSectors content={focus} items={content.sectors} />
      </CmsHomeSectionGroupField>
      {slug === "funding" ? <CmsFundingFocusSectorsEditor content={content} /> : null}
    </>
  );
}
