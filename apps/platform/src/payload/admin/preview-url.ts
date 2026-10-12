import { fundingOverviewSection } from "@/modules/content/FundingOverviewSections";
import { newsArticleHref } from "@/modules/content/NewsArticlePath";

const publicPath = (path: string) => `/api/preview?path=${encodeURIComponent(path)}`;

export function pagePreviewUrl({ slug }: { slug?: string | null }) {
  if (fundingOverviewSection(slug)) return publicPath("/how-to-apply/funding");
  return publicPath(slug ? `/${slug}` : "/");
}

export function newsPreviewUrl({ id }: { id?: number | string | null }) {
  return publicPath(id ? newsArticleHref(id) : "/news");
}

export function resourcePreviewUrl({ slug }: { slug?: string | null }) {
  return publicPath(slug ? `/resources/${slug}` : "/resources");
}

export const homepagePreviewUrl = () => publicPath("/");
