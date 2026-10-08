import "server-only";

import { getPayload, type Where } from "payload";
import configPromise from "@payload-config";

type ContentReadMode = { draft: boolean; where: Where };

export async function readHomepageDocument(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  return payload.findGlobal({
    slug: "homepage",
    depth: 1,
    draft,
    overrideAccess: true,
  });
}

export async function readHeaderDocument(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  return payload.findGlobal({
    slug: "header",
    draft,
    overrideAccess: true,
  });
}

export async function readFooterDocument(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  return payload.findGlobal({
    slug: "footer",
    draft,
    overrideAccess: true,
  });
}

export async function readContactDetailsDocument(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  return payload.findGlobal({
    slug: "contact-details",
    draft,
    overrideAccess: true,
  });
}

export async function readSiteSettingsDocument(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  return payload.findGlobal({
    slug: "site-settings",
    depth: 1,
    draft,
    overrideAccess: true,
  });
}

export async function readPageDocuments(slug: string, mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "pages",
    depth: 2,
    draft: mode.draft,
    limit: 1,
    overrideAccess: true,
    where: { and: [{ slug: { equals: slug } }, mode.where] },
  });
}

export async function readNewsDocuments(mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "news",
    depth: 1,
    draft: mode.draft,
    limit: 20,
    overrideAccess: true,
    sort: "-publishedAt",
    where: mode.where,
  });
}

export async function readEventsDocuments(mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "events",
    depth: 1,
    draft: mode.draft,
    limit: 20,
    overrideAccess: true,
    sort: "startsAt",
    where: mode.where,
  });
}

export async function readFaqsDocuments(mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "faqs",
    draft: mode.draft,
    limit: 50,
    overrideAccess: true,
    sort: "order",
    where: mode.where,
  });
}

export async function readStatisticsDocuments(mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "programme-statistics",
    draft: mode.draft,
    limit: 10,
    overrideAccess: true,
    sort: "order",
    where: mode.where,
  });
}

export async function readEligibilityContentDocuments(mode: ContentReadMode) {
  const payload = await getPayload({ config: configPromise });
  return payload.find({
    collection: "eligibility-content",
    draft: mode.draft,
    limit: 50,
    overrideAccess: true,
    sort: "order",
    where: mode.where,
  });
}
