import type { CmsPermissionResource } from "./permissions";

export function previewResource(path: string): CmsPermissionResource {
  if (path === "/") return "site-settings";
  if (path.startsWith("/news")) return "news";
  if (path.startsWith("/resources")) return "resources";
  if (path.startsWith("/events")) return "events";
  if (path.startsWith("/eligibility")) return "eligibility";
  if (path.startsWith("/faq")) return "faqs";
  return "pages";
}
