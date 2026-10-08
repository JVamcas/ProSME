import "server-only";

import { homeProcessContent, homeSupportContent } from "./HomeListContent";
import { media } from "./infrastructure/ContentProjection";
import { readHomeFeed } from "./infrastructure/PayloadHomeFeedRepository";
import {
  readHomepageDocument,
  readHeaderDocument,
  readFooterDocument,
  readContactDetailsDocument,
  readSiteSettingsDocument,
  readPageDocuments,
  readNewsDocuments,
  readEventsDocuments,
  readFaqsDocuments,
  readStatisticsDocuments,
  readEligibilityContentDocuments,
} from "./infrastructure/PayloadContentRepository";

import { draftMode } from "next/headers";
import { cache } from "react";
import type { Where } from "payload";
import { defaultHomeActionCards } from "./ContentDefaults";

import {
  cmsPermissionCode,
  type CmsPermissionResource,
} from "@/auth/authorization/permissions";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import {
  buildContact,
  buildFooter,
  buildHeader,
  buildHomepage,
  buildSiteSettings,
  getBuildPage,
} from "./ContentBuildFallbacks";
import type {
  ContactContent,
  EligibilityItem,
  FaqItem,
  FooterContent,
  HeaderContent,
  HomepageContent,
  ListingItem,
  PublicPageContent,
  SeoContent,
  SiteSettingsContent,
  StatisticItem,
} from "./ContentTypes";

// React cache shares reads only within one server render, including metadata.
// New requests recheck publication and preview permissions against current data.
export const getHomeNewsAndResources = cache(
  async function getHomeNewsAndResources() {
    return readHomeFeed();
  },
);

function isBuildFallbackEnabled() {
  return process.env.SKIP_CMS_PRERENDER === "1";
}

const queryMode = cache(async function queryMode(resource: CmsPermissionResource) {
  const requested = (await draftMode()).isEnabled;
  const draft = requested
    ? can(await getCurrentUser(), cmsPermissionCode(resource, "read"))
    : false;
  const where: Where = draft ? {} : { _status: { equals: "published" } };
  return { draft, where };
});

function seo(item: SeoContent): SeoContent {
  return {
    excludeFromSearch: item.excludeFromSearch,
    seoDescription: item.seoDescription,
    seoTitle: item.seoTitle,
  };
}

export const getHomepage = cache(
  async function getHomepage(): Promise<HomepageContent | null> {
    if (isBuildFallbackEnabled()) return buildHomepage;
    const { draft } = await queryMode("site-settings");
    const page = await readHomepageDocument(draft);
    if (!draft && page._status !== "published") return null;
    return {
      actionCards: {
        fundingTitle:
          page.actionCards?.fundingTitle ?? defaultHomeActionCards.fundingTitle,
        fundingDescription:
          page.actionCards?.fundingDescription ??
          defaultHomeActionCards.fundingDescription,
        eligibilityTitle:
          page.actionCards?.eligibilityTitle ??
          defaultHomeActionCards.eligibilityTitle,
        eligibilityDescription:
          page.actionCards?.eligibilityDescription ??
          defaultHomeActionCards.eligibilityDescription,
        trackingTitle:
          page.actionCards?.trackingTitle ?? defaultHomeActionCards.trackingTitle,
        trackingDescription:
          page.actionCards?.trackingDescription ??
          defaultHomeActionCards.trackingDescription,
      },
      applyHref: page.applyHref,
      applyLabel: page.applyLabel,
      eligibilityLabel: page.eligibilityLabel,
      eyebrow: page.eyebrow ?? "",
      heroImage: media(page.heroImage),
      heroPanelHeading: page.heroPanelHeading ?? "",
      heroPanelSummary: page.heroPanelSummary ?? "",
      fundingButtonLabel: page.fundingButtonLabel ?? "Funding Opportunities",
      fundingSlogan:
        page.fundingSlogan ?? "Brighter businesses. A stronger Namibia.",
      benefitFunding: page.benefitFunding ?? "Access funding",
      benefitCapacity: page.benefitCapacity ?? "Build your capacity",
      benefitOpportunity: page.benefitOpportunity ?? "Create opportunities",
      process: homeProcessContent(page.process),
      ...homeSupportContent(page),
      blocks: page.layout ?? [],
      newsHeading: page.newsHeading ?? "",
      newsIntroduction:
        page.newsIntroduction ??
        "Updates, stories and useful materials for Namibian entrepreneurs.",
      summary: page.summary ?? "",
      title: page.title ?? "",
      trackingLabel: page.trackingLabel,
    };
  },
);

export const getHeader = cache(
  async function getHeader(): Promise<HeaderContent> {
    if (isBuildFallbackEnabled()) return buildHeader;
    const { draft } = await queryMode("site-settings");
    const value = await readHeaderDocument(draft);

    return {
      announcement: value.announcement ?? "",
      applyHref: value.applyHref,
      applyLabel: value.applyLabel,
      signInLabel: value.signInLabel,
    };
  },
);

export const getFooter = cache(
  async function getFooter(): Promise<FooterContent> {
    if (isBuildFallbackEnabled()) return buildFooter;
    const { draft } = await queryMode("site-settings");
    const value = await readFooterDocument(draft);
    return {
      copyright: value.copyright ?? "",
      newsletterHeading: value.newsletterHeading ?? "",
      newsletterSummary: value.newsletterSummary ?? "",
      summary: value.summary ?? "",
      tagline: value.tagline ?? "",
    };
  },
);

export const getContactDetails = cache(
  async function getContactDetails(): Promise<ContactContent> {
    if (isBuildFallbackEnabled()) return buildContact;
    const { draft } = await queryMode("site-settings");
    return readContactDetailsDocument(draft);
  },
);

export const getSiteSettings = cache(
  async function getSiteSettings(): Promise<SiteSettingsContent> {
    if (isBuildFallbackEnabled()) return buildSiteSettings;
    const { draft } = await queryMode("site-settings");
    const value = await readSiteSettingsDocument(draft);
    return {
      allowIndexing: value.allowIndexing ?? false,
      defaultSocialImage: media(value.defaultSocialImage),
      siteDescription: value.siteDescription,
      siteName: value.siteName,
    };
  },
);

export const getPage = cache(
  async function getPage(slug: string): Promise<PublicPageContent | null> {
    if (isBuildFallbackEnabled()) return getBuildPage(slug);
    const mode = await queryMode("pages");
    const result = await readPageDocuments(slug, mode);
    const page = result.docs[0];
    return page
      ? {
          blocks: page.layout ?? [],
          content: page.content ?? null,
          eyebrow: page.eyebrow,
          image: media(page.featuredImage),
          summary: page.summary ?? "",
          title: page.title ?? "",
          ...seo(page),
        }
      : null;
  },
);

export const getNews = cache(
  async function getNews(): Promise<ListingItem[]> {
    if (isBuildFallbackEnabled()) return [];
    const mode = await queryMode("news");
    const result = await readNewsDocuments(mode);
    return result.docs.map((item) => ({
      body: item.body,
      date: item.publishedAt,
      id: item.id,
      image: media(item.image),
      slug: item.slug,
      summary: item.excerpt,
      title: item.title,
      ...seo(item),
    }));
  },
);

export const getEvents = cache(
  async function getEvents(): Promise<ListingItem[]> {
    if (isBuildFallbackEnabled()) return [];
    const mode = await queryMode("events");
    const result = await readEventsDocuments(mode);
    return result.docs.map((item) => ({
      body: item.body,
      date: item.startsAt,
      href: item.registrationUrl ?? undefined,
      id: item.id,
      image: media(item.image),
      location: item.location,
      slug: item.slug,
      summary: item.summary,
      title: item.title,
      ...seo(item),
    }));
  },
);

export const getFaqs = cache(
  async function getFaqs(): Promise<FaqItem[]> {
    if (isBuildFallbackEnabled()) return [];
    const mode = await queryMode("faqs");
    const result = await readFaqsDocuments(mode);
    return result.docs.map((item) => ({
      answer: item.answer,
      category: item.category,
      id: item.id,
      question: item.question,
    }));
  },
);

export const getStatistics = cache(
  async function getStatistics(): Promise<StatisticItem[]> {
    if (isBuildFallbackEnabled()) return [];
    const mode = await queryMode("statistics");
    const result = await readStatisticsDocuments(mode);
    return result.docs.map(({ value, label }) => ({ value, label }));
  },
);

export const getEligibilityContent = cache(
  async function getEligibilityContent(): Promise<EligibilityItem[]> {
    if (isBuildFallbackEnabled()) return [];
    const mode = await queryMode("eligibility");
    const result = await readEligibilityContentDocuments(mode);
    return result.docs.map(({ description, kind, label }) => ({
      description,
      kind,
      label,
    }));
  },
);

export const getListingItem = cache(
  async function getListingItem(kind: "news" | "events", slug: string) {
    const items = kind === "news" ? await getNews() : await getEvents();
    return items.find((item) => item.slug === slug) ?? null;
  },
);
