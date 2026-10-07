"use client";

import { GroupField, useEditDepth, useFormFields, useStepNav } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { reduceFieldsToValues } from "payload/shared";
import { useEffect } from "react";

import { cmsFundingHref, cmsFundingOverviewHref, cmsPageEditor } from "../../CmsPageEditors";
import { fundingOverviewSection } from "../../FundingOverviewSections";
import { fundingPageSections } from "../../FundingPageContent";
import { eligibilityFocusSection, eligibilityFocusSectorItems } from "../../EligibilityPageContent";
import { FundingSupport } from "../public/FundingSupport";
import { FundingPriorities } from "../public/FundingPriorities";
import { FocusSectors } from "../public/FocusSectors";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";

export default function CmsFundingOverviewGroupField(props: GroupFieldClientProps) {
  const fields = useFormFields(([state]) => state);
  const values = reduceFieldsToValues(fields, true);
  const section = fundingOverviewSection(values.slug);
  const editor = section ? cmsPageEditor(values.slug) : undefined;
  const depth = useEditDepth();
  const { stepNav, setStepNav } = useStepNav();

  useEffect(() => {
    if (depth !== 1 || !editor) return;
    const breadcrumbs = [
      { label: "Funding", url: cmsFundingHref },
      { label: "Overview", url: cmsFundingOverviewHref },
      { label: editor.breadcrumb, url: editor.href },
    ];
    if (breadcrumbs.every((crumb, index) =>
      stepNav[index]?.url === crumb.url && stepNav[index]?.label === crumb.label,
    ) && stepNav.length === breadcrumbs.length) {
      return;
    }
    setStepNav(breadcrumbs);
  }, [depth, editor, setStepNav, stepNav]);

  if (!editor || !section) return <GroupField {...props} />;
  const blocks = Array.isArray(values.layout) ? values.layout : [];
  const sections = fundingPageSections(blocks);

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={editor}
      description={`Edit ${section.title.toLowerCase()}. Saving or publishing changes only this section.`}
      previewLabel={`Live ${section.title.toLowerCase()} preview`}
    >
      {section.blockType === "fundingSupport" ? (
        <FundingSupport content={sections.support} />
      ) : null}
      {section.blockType === "fundingPriorities" ? (
        <FundingPriorities content={sections.priorities} />
      ) : null}
      {section.blockType === "eligibilityFocusSectors" ? (
        <FocusSectors
          content={eligibilityFocusSection(blocks)}
          items={eligibilityFocusSectorItems(blocks)}
        />
      ) : null}
    </CmsHomeSectionGroupField>
  );
}
