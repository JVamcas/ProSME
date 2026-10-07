export const cmsPageEditors = {
  about: {
    anchor: "about-content",
    title: "About",
    breadcrumb: "About the SME Fund",
    href: "/cms/about",
  },
  "how-to-apply": {
    anchor: "how-to-apply-content",
    title: "Application guide",
    breadcrumb: "Application guide",
    href: "/cms/funding/application-guide",
  },
  funding: {
    anchor: "funding-overview",
    title: "Overview",
    breadcrumb: "Overview",
    href: "/cms/funding/overview",
  },
  eligibility: {
    anchor: "funding-focus-sectors",
    title: "Focus sectors",
    breadcrumb: "Focus sectors",
    href: "/cms/funding/overview/focus-sectors",
  },
  faq: {
    anchor: "faq-content",
    title: "FAQ",
    breadcrumb: "FAQ",
    href: "/cms/faq",
  },
} as const;

export type CmsPageEditorSlug = keyof typeof cmsPageEditors;

export const cmsFundingHref = "/cms/funding";
export const cmsFundingOverviewHref = "/cms/funding/overview";

export function cmsPageEditorSlugForPath(pathname: string): CmsPageEditorSlug | undefined {
  if (pathname === cmsPageEditors.about.href) return "about";
  if (pathname === cmsPageEditors["how-to-apply"].href) return "how-to-apply";
  if (pathname === cmsFundingOverviewHref) return "funding";
  if (pathname === cmsPageEditors.eligibility.href) return "eligibility";
  if (pathname === cmsPageEditors.faq.href) return "faq";
  return undefined;
}

export function cmsPageEditor(slug: unknown) {
  if (
    slug === "about" ||
    slug === "how-to-apply" ||
    slug === "funding" ||
    slug === "eligibility" ||
    slug === "faq"
  ) {
    return cmsPageEditors[slug];
  }
  return undefined;
}
