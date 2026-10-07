"use client";

import {
  GroupField,
  useEditDepth,
  useFormFields,
  useStepNav,
} from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";
import { useEffect } from "react";

import type { PublicPageContent } from "../../ContentTypes";
import { defaultPages } from "../../ContentDefaults";
import { cmsFundingHref, cmsPageEditor } from "../../CmsPageEditors";
import { AboutContent } from "../public/AboutContent";
import { ApplicationGuideContent } from "../public/ApplicationGuideContent";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { useCmsMediaPreview } from "./useCmsMediaPreview";
import { CmsFaqContentGroupField } from "./CmsFaqContentGroupField";

export default function CmsPageContentGroupField(props: GroupFieldClientProps) {
  const values = useFormFields(([fields]) => ({
    slug: fields.slug?.value,
    eyebrow: fields.eyebrow?.value,
    title: fields.title?.value,
    summary: fields.summary?.value,
    content: fields.content?.value,
    image: fields.featuredImage?.value,
  }));
  const image = useCmsMediaPreview(values.image);
  const depth = useEditDepth();
  const { stepNav, setStepNav } = useStepNav();
  const editor = cmsPageEditor(values.slug);
  const title =
    typeof values.title === "string" && values.title
      ? values.title
      : editor?.breadcrumb ?? "";
  const breadcrumb = values.slug === "about" ? title : editor?.breadcrumb;

  useEffect(() => {
    if (depth !== 1 || !editor || !breadcrumb) return;

    const fundingGuide = values.slug === "how-to-apply";
    const current = stepNav[fundingGuide ? 1 : 0];
    if (
      stepNav.length === (fundingGuide ? 2 : 1) &&
      current?.label === breadcrumb &&
      current?.url === editor.href &&
      (!fundingGuide || stepNav[0]?.url === cmsFundingHref)
    ) {
      return;
    }

    // Payload renders the CMS root itself. Retain only the page breadcrumb.
    const pageCrumb = { label: breadcrumb, url: editor.href };
    setStepNav(
      fundingGuide
        ? [{ label: "Funding", url: cmsFundingHref }, pageCrumb]
        : [pageCrumb],
    );
  }, [breadcrumb, depth, editor, setStepNav, stepNav, values.slug]);

  if (!editor || values.slug === "funding" || values.slug === "eligibility") {
    return <GroupField {...props} />;
  }

  const page: PublicPageContent = {
    eyebrow:
      typeof values.eyebrow === "string"
        ? values.eyebrow
        : defaultPages[values.slug === "faq" ? "faq" : "how-to-apply"].eyebrow,
    title: typeof values.title === "string" ? values.title : "",
    summary: typeof values.summary === "string" ? values.summary : "",
    content: (values.content as PublicPageContent["content"]) ?? null,
    image,
    blocks: [],
  };

  if (values.slug === "faq") {
    return <CmsFaqContentGroupField page={page} fieldProps={props} />;
  }

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={editor}
      description={`Edit the ${editor.title} page banner and rich-text body. Save a draft, preview the page, then publish when it is ready.`}
      previewLabel={`Live ${editor.title} preview`}
    >
      {values.slug === "about" ? (
        <AboutContent page={page} />
      ) : (
        <ApplicationGuideContent page={page} />
      )}
    </CmsHomeSectionGroupField>
  );
}
