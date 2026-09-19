import "server-only";

import { draftMode } from "next/headers";
import { getPayload, type Where } from "payload";
import configPromise from "@payload-config";

import { cmsCapability, type CmsResource } from "@/auth/authorization/capabilities";
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
import type { CmsImage, ContactContent, EligibilityItem, EligibilityRule, FaqItem, FooterContent, FundingCallItem, HeaderContent, HomepageContent, ListingItem, PublicPageContent, SeoContent, SiteSettingsContent, StatisticItem } from "./ContentTypes";

async function payloadClient() { return getPayload({ config: configPromise }); }

function isBuildFallbackEnabled() {
  return process.env.SKIP_CMS_PRERENDER === "1";
}

async function queryMode(resource: CmsResource) {
  const requested = (await draftMode()).isEnabled;
  const draft = requested ? can(await getCurrentUser(), cmsCapability(resource, "read")) : false;
  const where: Where = draft ? {} : { _status: { equals: "published" } };
  return { draft, where };
}

function media(value: unknown): CmsImage | undefined {
  if (!value || typeof value !== "object" || !("url" in value) || typeof value.url !== "string") return undefined;
  return { alt: "alt" in value && typeof value.alt === "string" ? value.alt : "", height: "height" in value && typeof value.height === "number" ? value.height : undefined, url: value.url, width: "width" in value && typeof value.width === "number" ? value.width : undefined };
}

function seo(item: SeoContent): SeoContent {
  return { excludeFromSearch: item.excludeFromSearch, seoDescription: item.seoDescription, seoTitle: item.seoTitle };
}

export async function getHomepage(): Promise<HomepageContent> {
  if (isBuildFallbackEnabled()) return buildHomepage;
  const payload = await payloadClient();
  const { draft } = await queryMode("site-settings");
  const page = await payload.findGlobal({ slug: "homepage", depth: 1, draft, overrideAccess: true });
  return { applyHref: page.applyHref, applyLabel: page.applyLabel, eligibilityLabel: page.eligibilityLabel, eyebrow: page.eyebrow ?? "", heroImage: media(page.heroImage), heroPanelHeading: page.heroPanelHeading ?? "", heroPanelSummary: page.heroPanelSummary ?? "", blocks: page.layout ?? [], newsHeading: page.newsHeading ?? "", summary: page.summary ?? "", title: page.title ?? "", trackingLabel: page.trackingLabel };
}

export async function getHeader(): Promise<HeaderContent> {
  if (isBuildFallbackEnabled()) return buildHeader;
  const payload = await payloadClient();
  const { draft } = await queryMode("site-settings");
  const value = await payload.findGlobal({
    slug: "header",
    draft,
    overrideAccess: true,
  });

  return {
    announcement: value.announcement ?? "",
    applyHref: value.applyHref,
    applyLabel: value.applyLabel,
    signInLabel: value.signInLabel,
  };
}

export async function getFooter(): Promise<FooterContent> {
  if (isBuildFallbackEnabled()) return buildFooter;
  const payload = await payloadClient();
  const { draft } = await queryMode("site-settings");
  const value = await payload.findGlobal({ slug: "footer", draft, overrideAccess: true });
  return { copyright: value.copyright ?? "", newsletterHeading: value.newsletterHeading ?? "", newsletterSummary: value.newsletterSummary ?? "", summary: value.summary ?? "", tagline: value.tagline ?? "" };
}

export async function getContactDetails(): Promise<ContactContent> {
  if (isBuildFallbackEnabled()) return buildContact;
  const payload = await payloadClient();
  const { draft } = await queryMode("site-settings");
  return payload.findGlobal({ slug: "contact-details", draft, overrideAccess: true });
}

export async function getSiteSettings(): Promise<SiteSettingsContent> {
  if (isBuildFallbackEnabled()) return buildSiteSettings;
  const payload = await payloadClient();
  const { draft } = await queryMode("site-settings");
  const value = await payload.findGlobal({ slug: "site-settings", depth: 1, draft, overrideAccess: true });
  return { allowIndexing: value.allowIndexing ?? false, analyticsMeasurementId: value.analyticsMeasurementId, defaultSocialImage: media(value.defaultSocialImage), siteDescription: value.siteDescription, siteName: value.siteName };
}

export async function getPage(slug: string): Promise<PublicPageContent | null> {
  if (isBuildFallbackEnabled()) return getBuildPage(slug);
  const payload = await payloadClient();
  const mode = await queryMode("pages");
  const result = await payload.find({ collection: "pages", depth: 2, draft: mode.draft, limit: 1, overrideAccess: true, where: { and: [{ slug: { equals: slug } }, mode.where] } });
  const page = result.docs[0];
  return page ? { blocks: page.layout ?? [], content: page.content, image: media(page.featuredImage), summary: page.summary ?? "", title: page.title, ...seo(page) } : null;
}

export async function getNews(): Promise<ListingItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("news");
  const result = await payload.find({ collection: "news", depth: 1, draft: mode.draft, limit: 20, overrideAccess: true, sort: "-publishedAt", where: mode.where });
  return result.docs.map((item) => ({ body: item.body, date: item.publishedAt, id: item.id, image: media(item.image), slug: item.slug, summary: item.excerpt, title: item.title, ...seo(item) }));
}

export async function getResources(): Promise<ListingItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("resources");
  const result = await payload.find({ collection: "resources", depth: 1, draft: mode.draft, limit: 20, overrideAccess: true, sort: "-publishedAt", where: mode.where });
  return result.docs.map((item) => ({ category: item.category, date: item.publishedAt, href: resourceHref(item.file, item.externalUrl), id: item.id, image: media(item.thumbnail), slug: item.slug, summary: item.description, title: item.title, ...seo(item) }));
}

function resourceHref(file: unknown, externalUrl?: string | null) {
  if (externalUrl) return externalUrl;
  return file && typeof file === "object" && "url" in file && typeof file.url === "string" ? file.url : undefined;
}

export async function getEvents(): Promise<ListingItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("events");
  const result = await payload.find({ collection: "events", depth: 1, draft: mode.draft, limit: 20, overrideAccess: true, sort: "startsAt", where: mode.where });
  return result.docs.map((item) => ({ body: item.body, date: item.startsAt, href: item.registrationUrl ?? undefined, id: item.id, image: media(item.image), location: item.location, slug: item.slug, summary: item.summary, title: item.title, ...seo(item) }));
}

export async function getFaqs(): Promise<FaqItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("faqs");
  const result = await payload.find({ collection: "faqs", draft: mode.draft, limit: 50, overrideAccess: true, sort: "order", where: mode.where });
  return result.docs.map((item) => ({ answer: item.answer, category: item.category, id: item.id, question: item.question }));
}

export async function getStatistics(): Promise<StatisticItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("statistics");
  const result = await payload.find({ collection: "programme-statistics", draft: mode.draft, limit: 10, overrideAccess: true, sort: "order", where: mode.where });
  return result.docs.map(({ value, label }) => ({ value, label }));
}

export async function getEligibilityContent(): Promise<EligibilityItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("eligibility");
  const result = await payload.find({ collection: "eligibility-content", draft: mode.draft, limit: 50, overrideAccess: true, sort: "order", where: mode.where });
  return result.docs.map(({ description, hardStop, key, kind, label }) => ({ description, hardStop, key, kind, label }));
}

export async function getEligibilityRules(): Promise<EligibilityRule[]> {
  const items = await getEligibilityContent();
  return items.filter((item) => item.kind === "checkerQuestion" && item.key).map((item) => ({ hardStop: item.hardStop ?? false, help: item.description, id: item.key!, question: item.label }));
}

export async function getFundingCalls(): Promise<FundingCallItem[]> {
  if (isBuildFallbackEnabled()) return [];
  const payload = await payloadClient();
  const mode = await queryMode("funding-calls");
  const result = await payload.find({ collection: "funding-calls", depth: 1, draft: mode.draft, limit: 20, overrideAccess: true, sort: "-opensAt", where: mode.where });
  return result.docs.map((item) => ({ applicationUrl: item.applicationUrl, closesAt: item.closesAt, eligibility: item.eligibility, id: item.id, image: media(item.image), maximumAmount: item.maximumAmount, minimumAmount: item.minimumAmount, opensAt: item.opensAt, slug: item.slug, status: item.callStatus, summary: item.summary, title: item.title, ...seo(item) }));
}

export async function getListingItem(kind: "news" | "events", slug: string) {
  const items = kind === "news" ? await getNews() : await getEvents();
  return items.find((item) => item.slug === slug) ?? null;
}
