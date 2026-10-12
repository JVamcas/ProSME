"use client";

import { ArticleImage, type ArticleImageProps } from "../public/NewsArticleBlock";
import { useCmsMediaRecord } from "./useCmsMediaPreview";

export function CmsArticleImagePreview({ value, alt, sizes }: ArticleImageProps) {
  const record = useCmsMediaRecord(value);
  return <ArticleImage value={record} alt={alt} sizes={sizes} />;
}
