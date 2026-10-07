import { fundingOverviewSections } from "./FundingOverviewSections";

const overviewEditors = Object.fromEntries(
  Object.entries(fundingOverviewSections).map(([slug, section]) => [
    slug,
    {
      ...section,
      anchor: slug,
      breadcrumb: section.title,
    },
  ]),
) as {
  [Slug in keyof typeof fundingOverviewSections]: typeof fundingOverviewSections[Slug] & {
    anchor: string;
    breadcrumb: string;
  };
};

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
  ...overviewEditors,
} as const;

export type CmsPageEditorSlug = keyof typeof cmsPageEditors;

export const cmsFundingHref = "/cms/funding";
export const cmsFundingOverviewHref = "/cms/funding/overview";

export function cmsPageEditorSlugForPath(pathname: string): CmsPageEditorSlug | undefined {
  return (Object.keys(cmsPageEditors) as CmsPageEditorSlug[]).find(
    (slug) => (
      slug !== "funding" &&
      slug !== "eligibility" &&
      cmsPageEditors[slug].href === pathname
    ),
  );
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
  if (
    slug === "funding-support" ||
    slug === "funding-priority-applicants" ||
    slug === "funding-focus-sectors"
  ) {
    return cmsPageEditors[slug];
  }
  return undefined;
}
