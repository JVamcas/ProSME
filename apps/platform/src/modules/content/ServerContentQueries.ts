import "server-only";

import { homeProcessContent, homeSupportContent } from "./HomeListContent";
import { media } from "./infrastructure/ContentProjection";
import { connection } from "next/server";
import { getContentReadMode as queryMode } from "./application/ServerContentReadService";
import * as published from "./infrastructure/PublishedContentRepository";
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

import { cache } from "react";
import { defaultHomeActionCards } from "./ContentDefaults";

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
// Published reads also share a tagged persistent cache; previews bypass it.
export const getHomeNewsAndResources = cache(
  async function getHomeNewsAndResources() {
    await connection();
    return published.readPublishedHomeFeed();
  },
);

function seo(item: SeoContent): SeoContent {
  return {
    excludeFromSearch: item.excludeFromSearch,
    seoDescription: item.seoDescription,
    seoTitle: item.seoTitle,
  };
}

export const getHomepage = cache(
  async function getHomepage(): Promise<HomepageContent | null> {
    const { draft } = await queryMode("site-settings");
    const page = draft
      ? await readHomepageDocument(true)
      : await published.readPublishedHomepage();
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
    const { draft } = await queryMode("site-settings");
    const value = draft
      ? await readHeaderDocument(true)
      : await published.readPublishedHeader();

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
    const { draft } = await queryMode("site-settings");
    const value = draft
      ? await readFooterDocument(true)
      : await published.readPublishedFooter();
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
    const { draft } = await queryMode("site-settings");
    return draft
      ? readContactDetailsDocument(true)
      : published.readPublishedContact();
  },
);

export const getSiteSettings = cache(
  async function getSiteSettings(): Promise<SiteSettingsContent> {
    const { draft } = await queryMode("site-settings");
    const value = draft
      ? await readSiteSettingsDocument(true)
      : await published.readPublishedSiteSettings();
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
    const mode = await queryMode("pages");
    const result = mode.draft
      ? await readPageDocuments(slug, mode)
      : await published.readPublishedPage(slug);
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
    const mode = await queryMode("news");
    const result = mode.draft
      ? await readNewsDocuments(mode)
      : await published.readPublishedNews();
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
    const mode = await queryMode("events");
    const result = mode.draft
      ? await readEventsDocuments(mode)
      : await published.readPublishedEvents();
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
    const mode = await queryMode("faqs");
    const result = mode.draft
      ? await readFaqsDocuments(mode)
      : await published.readPublishedFaqs();
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
    const mode = await queryMode("statistics");
    const result = mode.draft
      ? await readStatisticsDocuments(mode)
      : await published.readPublishedStatistics();
    return result.docs.map(({ value, label }) => ({ value, label }));
  },
);

export const getEligibilityContent = cache(
  async function getEligibilityContent(): Promise<EligibilityItem[]> {
    const mode = await queryMode("eligibility");
    const result = mode.draft
      ? await readEligibilityContentDocuments(mode)
      : await published.readPublishedEligibility();
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
