import "server-only";

import { cachePublishedContent } from "./PublishedContentCache";
import * as content from "./PayloadContentRepository";
import { readHomeFeed } from "./PayloadHomeFeedRepository";
import { readFundingOverviewDocuments } from "./PayloadFundingOverviewRepository";
import {
  readResourceBySlug,
  readResourcePage,
  readResourceSitemap,
} from "./PayloadResourceCentreRepository";

const publishedMode = {
  draft: false,
  where: { _status: { equals: "published" } },
};

export const readPublishedHomepage = cachePublishedContent(
  () => content.readHomepageDocument(false),
  "homepage",
  ["homepage"],
);

export const readPublishedHeader = cachePublishedContent(
  () => content.readHeaderDocument(false),
  "header",
  ["header"],
);

export const readPublishedFooter = cachePublishedContent(
  () => content.readFooterDocument(false),
  "footer",
  ["footer"],
);

export const readPublishedContact = cachePublishedContent(
  () => content.readContactDetailsDocument(false),
  "contact-details",
  ["contact-details"],
);

export const readPublishedSiteSettings = cachePublishedContent(
  () => content.readSiteSettingsDocument(false),
  "site-settings",
  ["site-settings"],
);

export const readPublishedPage = cachePublishedContent(
  (slug: string) => content.readPageDocuments(slug, publishedMode),
  "page",
  ["pages"],
);

export const readPublishedNews = cachePublishedContent(
  () => content.readNewsDocuments(publishedMode),
  "news",
  ["news"],
);

export const readPublishedEvents = cachePublishedContent(
  () => content.readEventsDocuments(publishedMode),
  "events",
  ["events"],
);

export const readPublishedFaqs = cachePublishedContent(
  () => content.readFaqsDocuments(publishedMode),
  "faqs",
  ["faqs"],
);

export const readPublishedStatistics = cachePublishedContent(
  () => content.readStatisticsDocuments(publishedMode),
  "statistics",
  ["programme-statistics"],
);

export const readPublishedEligibility = cachePublishedContent(
  () => content.readEligibilityContentDocuments(publishedMode),
  "eligibility",
  ["eligibility-content"],
);

export const readPublishedHomeFeed = cachePublishedContent(
  readHomeFeed,
  "home-feed",
  ["news", "resources"],
);

export const readPublishedFundingOverview = cachePublishedContent(
  () => readFundingOverviewDocuments(false),
  "funding-overview",
  ["pages"],
);

// The normalized page is an argument in the cache key. Counts and rows are
// cached together and all pages expire together when resources change.
export const readPublishedResourcePage = cachePublishedContent(
  (page: number) => readResourcePage(page, publishedMode),
  "resource-page",
  ["resources"],
);

export const readPublishedResource = cachePublishedContent(
  (slug: string) => readResourceBySlug(slug, publishedMode),
  "resource",
  ["resources"],
);

export const readPublishedResourceSitemap = cachePublishedContent(
  readResourceSitemap,
  "resource-sitemap",
  ["resources"],
);
