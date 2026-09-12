import type { CmsResource } from "./capabilities";

export function previewResource(path: string): CmsResource {
  if (path === "/") return "site-settings";
  if (path.startsWith("/news")) return "news";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/events")) return "events";
  if (path.startsWith("/funding")) return "funding-calls";
  if (path.startsWith("/eligibility")) return "eligibility";
  if (path.startsWith("/faq")) return "faqs";
  return "pages";
}
