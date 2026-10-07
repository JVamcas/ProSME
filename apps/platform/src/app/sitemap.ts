import type { MetadataRoute } from "next";

import { getServerEnvironment } from "@/lib/env/server";
import {
  getEvents,
  getNews,
  getSiteSettings,
} from "@/modules/content/ServerContentQueries";
import { getResourceSitemapEntries } from "@/modules/content/ServerResourceCentreService";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";



export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const environment = getServerEnvironment();
  const routes = [
    "",
    "/about",
    "/funding",
    "/eligibility",
    "/how-to-apply",
    "/news",
    "/resources",
    "/events",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ];
  const [news, resources, events, calls, settings] = await Promise.all([
    getNews(),
    getResourceSitemapEntries(),
    getEvents(),
    listPublicFundingCalls({ limit: 100 }),
    getSiteSettings(),
  ]);

  if (!settings.allowIndexing) {
    return [];
  }

  const dynamicRoutes = [
    ...news.filter(indexable).map((item) => `/news/${item.slug}`),
    ...resources.map((item) => `/resources/${item.slug}`),
    ...events.filter(indexable).map((item) => `/events/${item.slug}`),
    ...calls.items.map((item) => `/funding/${item.slug}`),
  ];

  return [...routes, ...dynamicRoutes].map((route) => ({
    url: `${environment.PUBLIC_SITE_URL}${route}`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}

function indexable(item: { excludeFromSearch?: boolean | null }) {
  return !item.excludeFromSearch;
}
