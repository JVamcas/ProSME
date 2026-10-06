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
import { AboutContent } from "../public/AboutContent";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { useCmsMediaPreview } from "./useCmsMediaPreview";

export default function CmsAboutContentGroupField(props: GroupFieldClientProps) {
  const values = useFormFields(([fields]) => ({
    slug: fields.slug?.value,
    title: fields.title?.value,
    summary: fields.summary?.value,
    content: fields.content?.value,
    image: fields.featuredImage?.value,
  }));
  const image = useCmsMediaPreview(values.image);
  const depth = useEditDepth();
  const { stepNav, setStepNav } = useStepNav();
  const title =
    typeof values.title === "string" && values.title
      ? values.title
      : defaultPages.about.title;

  useEffect(() => {
    if (depth !== 1 || values.slug !== "about") return;

    const current = stepNav[0];
    if (
      stepNav.length === 1 &&
      current.label === title &&
      current.url === "/cms/about"
    ) {
      return;
    }

    // Payload renders the CMS root itself. Retain only the page breadcrumb.
    setStepNav([{ label: title, url: "/cms/about" }]);
  }, [depth, setStepNav, stepNav, title, values.slug]);

  if (values.slug !== "about") {
    return <GroupField {...props} />;
  }

  const page: PublicPageContent = {
    title: typeof values.title === "string" ? values.title : "",
    summary: typeof values.summary === "string" ? values.summary : "",
    content: (values.content as PublicPageContent["content"]) ?? null,
    image,
    blocks: [],
  };

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={{ anchor: "about-content", title: "About" }}
      description="Edit the About page banner and rich-text body. Save a draft, preview the page, then publish when it is ready."
      previewLabel="Live About preview"
    >
      <AboutContent page={page} />
    </CmsHomeSectionGroupField>
  );
}
