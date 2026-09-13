import type { Metadata } from "next";

import type { CmsImage, SeoContent } from "./ContentTypes";

export function contentMetadata(content: SeoContent & { image?: CmsImage; summary: string; title: string }): Metadata {
  const title = content.seoTitle || content.title;
  const description = content.seoDescription || content.summary;
  const images = content.image ? [{ alt: content.image.alt, height: content.image.height ?? undefined, url: content.image.url, width: content.image.width ?? undefined }] : undefined;
  return {
    description,
    openGraph: { description, images, title },
    robots: content.excludeFromSearch ? { follow: false, index: false } : undefined,
    title,
  };
}
