"use client";

import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { GroupFieldClientProps } from "payload";

import type { ListingItem } from "../../ContentTypes";
import { ContentListingCard } from "../public/ContentListingCard";
import { NewsArticleContent } from "../public/NewsArticleContent";
import { PublicPageHeader } from "../public/PublicPageHeader";
import { CmsHomeSectionGroupField } from "./CmsHomeSectionGroupField";
import { useCmsMediaPreview } from "./useCmsMediaPreview";
import { CmsRichTextMediaPreview } from "./CmsRichTextMediaPreview";
import { CmsArticleImagePreview } from "./CmsArticleImagePreview";

export default function CmsNewsContentGroupField(props: GroupFieldClientProps) {
  const { id } = useDocumentInfo();
  const values = useFormFields(([fields]) => ({
    title: fields.title?.value,
    slug: fields.slug?.value,
    excerpt: fields.excerpt?.value,
    body: fields.body?.value,
    image: fields.image?.value,
    publishedAt: fields.publishedAt?.value,
  }));
  const image = useCmsMediaPreview(values.image);
  const date =
    typeof values.publishedAt === "string" &&
    Number.isFinite(Date.parse(values.publishedAt))
      ? values.publishedAt
      : undefined;
  const item: ListingItem = {
    id: Number(id) || 0,
    title: typeof values.title === "string" ? values.title : "News title",
    slug: typeof values.slug === "string" ? values.slug : "preview",
    summary: typeof values.excerpt === "string" ? values.excerpt : "",
    image,
    date,
  };
  const body = values.body as ListingItem["body"];

  return (
    <CmsHomeSectionGroupField
      fieldProps={props}
      editor={{ anchor: "news-content", title: "News" }}
      description="Changes automatically save as a draft after two seconds without edits. Check the saving status in the page controls. Publish when the article is ready."
      previewLabel="Live news preview"
    >
      <div className="p-4 sm:p-6">
        <p className="mb-3 text-sm font-semibold">News card preview</p>
        <div className="mx-auto w-full max-w-md">
          <ContentListingCard item={item} kind="news" />
        </div>
      </div>
      <p className="m-0 border-t border-brand-navy/10 px-6 py-4 text-sm font-semibold">
        Article preview
      </p>
      <PublicPageHeader
        eyebrow="News"
        image={item.image}
        title={item.title}
        summary={item.summary}
      />
      {body ? (
        <div className="mx-auto w-full max-w-6xl p-6">
          <NewsArticleContent
            data={body}
            MediaUpload={CmsRichTextMediaPreview}
            Image={CmsArticleImagePreview}
          />
        </div>
      ) : null}
    </CmsHomeSectionGroupField>
  );
}
