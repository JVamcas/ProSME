import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

export type CmsImage = { alt: string; height?: number | null; url: string; width?: number | null };
export type SeoContent = { excludeFromSearch?: boolean | null; seoDescription?: string | null; seoTitle?: string | null };

export type PublicPageContent = SeoContent & {
  blocks: unknown[];
  content: SerializedEditorState | null;
  image?: CmsImage;
  summary: string;
  title: string;
};

export type ListingItem = SeoContent & {
  body?: SerializedEditorState | null;
  category?: string;
  date?: string | null;
  href?: string;
  id: number;
  image?: CmsImage;
  location?: string;
  slug: string;
  summary: string;
  title: string;
};

export type FaqItem = { id: number; question: string; answer: SerializedEditorState; category: string };
export type StatisticItem = { value: string; label: string };
export type EligibilityItem = { description: string; hardStop?: boolean | null; key?: string | null; kind: "criterion" | "focusSector" | "checkerQuestion"; label: string };
export type EligibilityRule = { id: string; question: string; help: string; hardStop: boolean };

export type FundingCallItem = SeoContent & {
  applicationUrl?: string | null;
  closesAt: string;
  eligibility: SerializedEditorState;
  id: number;
  image?: CmsImage;
  maximumAmount?: number | null;
  minimumAmount?: number | null;
  opensAt: string;
  slug: string;
  status: "upcoming" | "open" | "closed";
  summary: string;
  title: string;
};

export type HomepageContent = {
  applyHref: string;
  applyLabel: string;
  eligibilityLabel: string;
  eyebrow: string;
  heroImage?: CmsImage;
  heroPanelHeading: string;
  heroPanelSummary: string;
  blocks: unknown[];
  newsHeading: string;
  summary: string;
  title: string;
  trackingLabel: string;
};

export type HeaderContent = {
  announcement: string;
  applyHref: string;
  applyLabel: string;
  signInLabel: string;
};
export type FooterContent = { copyright: string; newsletterHeading: string; newsletterSummary: string; summary: string; tagline: string };
export type ContactContent = { address: string; email: string; officeHours?: string | null; phone?: string | null };
export type SiteSettingsContent = { allowIndexing: boolean; analyticsMeasurementId?: string | null; defaultSocialImage?: CmsImage; siteDescription: string; siteName: string };
