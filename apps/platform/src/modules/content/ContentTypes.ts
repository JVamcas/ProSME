import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { CmsImageSize } from "./ContentImageSizes";

export type CmsImageVariant = {
  height?: number | null;
  url: string;
  width?: number | null;
};

export type CmsImage = {
  alt: string;
  height?: number | null;
  url: string;
  width?: number | null;
  sizes?: Partial<Record<CmsImageSize, CmsImageVariant | null>>;
};
export type SeoContent = {
  excludeFromSearch?: boolean | null;
  seoDescription?: string | null;
  seoTitle?: string | null;
};

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

export type FaqItem = {
  id: number;
  question: string;
  answer: SerializedEditorState;
  category: string;
};
export type StatisticItem = { value: string; label: string };
export type EligibilityItem = {
  description: string;
  kind: "criterion" | "focusSector";
  label: string;
};

export type HomeBannerContent = Pick<
  HomepageContent,
  | "eyebrow"
  | "title"
  | "summary"
  | "heroImage"
  | "heroPanelHeading"
  | "heroPanelSummary"
  | "applyLabel"
  | "fundingButtonLabel"
  | "benefitFunding"
  | "benefitCapacity"
  | "benefitOpportunity"
>;

export type HomepageContent = {
  actionCards: {
    fundingTitle: string;
    fundingDescription: string;
    eligibilityTitle: string;
    eligibilityDescription: string;
    trackingTitle: string;
    trackingDescription: string;
  };
  applyHref: string;
  applyLabel: string;
  eligibilityLabel: string;
  eyebrow: string;
  heroImage?: CmsImage;
  heroPanelHeading: string;
  heroPanelSummary: string;
  fundingButtonLabel: string;
  fundingSlogan: string;
  benefitFunding: string;
  benefitCapacity: string;
  benefitOpportunity: string;
  process: {
    heading: string;
    introduction: string;
    steps: { id?: string; title: string; description: string }[];
  };
  supportCards: { id?: string; label: string; description: string }[];
  supportHeading: string;
  supportIntroduction: string;
  blocks: unknown[];
  newsHeading: string;
  newsIntroduction: string;
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
export type FooterContent = {
  copyright: string;
  newsletterHeading: string;
  newsletterSummary: string;
  summary: string;
  tagline: string;
};
export type ContactContent = {
  address: string;
  email: string;
  officeHours?: string | null;
  phone?: string | null;
};
export type SiteSettingsContent = {
  allowIndexing: boolean;
  analyticsMeasurementId?: string | null;
  defaultSocialImage?: CmsImage;
  siteDescription: string;
  siteName: string;
};
