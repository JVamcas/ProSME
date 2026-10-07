import type {
  ContactContent,
  FooterContent,
  HeaderContent,
  HomepageContent,
  PublicPageContent,
  SiteSettingsContent,
} from "./ContentTypes";
import {
  defaultHomeActionCards,
  defaultPages,
  defaultHomeProcess,
  defaultSupportGroups,
} from "./ContentDefaults";

export const buildHomepage: HomepageContent = {
  actionCards: defaultHomeActionCards,
  applyHref: "/portal/applications/new",
  applyLabel: "Apply Now",
  blocks: [],
  eligibilityLabel: "Check My Eligibility",
  eyebrow: "Funding today. A stronger tomorrow.",
  heroPanelHeading: "Bigger businesses. A brighter Namibia.",
  heroPanelSummary:
    "Open to eligible MSMEs from all 14 regions and every sector.",
  fundingButtonLabel: "Funding Opportunities",
  fundingSlogan: "Brighter businesses. A stronger Namibia.",
  benefitFunding: "Access funding",
  benefitCapacity: "Build your capacity",
  benefitOpportunity: "Create opportunities",
  process: defaultHomeProcess,
  supportCards: defaultSupportGroups,
  supportHeading: "Who we support",
  supportIntroduction:
    "The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:",
  newsHeading: "Latest News & Resources",
  newsIntroduction:
    "Updates, stories and useful materials for Namibian entrepreneurs.",
  summary:
    "Funding and business development support for Namibian MSMEs ready to grow.",
  title: "Your business has potential. We help you take the next step.",
  trackingLabel: "Track Application",
};

export const buildHeader: HeaderContent = {
  announcement: "An initiative under the SME Fund Project",
  applyHref: "/portal/applications/new",
  applyLabel: "Apply Now",
  signInLabel: "Sign in",
};

export const buildFooter: FooterContent = {
  copyright: "© 2026 SME Fund Namibia. All rights reserved.",
  newsletterHeading: "Stay in the loop",
  newsletterSummary:
    "Get funding-call updates and approved business resources.",
  summary:
    "Supporting Namibian MSMEs to grow, compete and create opportunities.",
  tagline: "Funding today. A stronger tomorrow.",
};

export const buildContact: ContactContent = {
  address:
    "Namibia Investment Promotion and Development Board, Windhoek, Namibia",
  email: "info@smefund.na",
  officeHours: "Monday to Friday, 08:00–17:00",
};

export const buildSiteSettings: SiteSettingsContent = {
  allowIndexing: true,
  siteDescription:
    "Funding and business development support for Namibian MSMEs.",
  siteName: "SME Fund Namibia",
};

const pageCopy: Record<string, Pick<PublicPageContent, "summary" | "title">> = {
  about: {
    title: "About the SME Fund",
    summary:
      "An initiative strengthening Namibia's MSME ecosystem through finance and practical business support.",
  },
  contact: {
    title: "Contact the SME Fund",
    summary: "Contact us for programme, eligibility or application support.",
  },
  eligibility: {
    title: "Check your eligibility",
    summary: "",
  },
  events: {
    title: "Events",
    summary: "Official briefings, workshops and enterprise-development events.",
  },
  faq: defaultPages.faq,
  funding: {
    title: "Funding to move your business forward",
    summary: "Targeted grants and practical support for Namibian MSMEs.",
  },
  "how-to-apply": defaultPages["how-to-apply"],
  news: {
    title: "Latest news",
    summary: "Official announcements and programme updates.",
  },
  privacy: {
    title: "Privacy policy",
    summary:
      "How this website collects, uses and protects personal information.",
  },
  resources: {
    title: "Guides and documents",
    summary: "Approved information to help your MSME prepare and apply.",
  },
  terms: {
    title: "Terms and conditions",
    summary: "The terms that apply when using this website.",
  },
};

export function getBuildPage(slug: string): PublicPageContent | null {
  const copy = pageCopy[slug];

  return copy
    ? {
        blocks: [],
        content: null,
        ...copy,
      }
    : null;
}
