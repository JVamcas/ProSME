import type { MetadataRoute } from "next";

import { getEvents, getFundingCalls, getNews, getResources, getSiteSettings } from "@/modules/content/content.queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.smefund.na";
  const routes = ["", "/about", "/funding", "/eligibility", "/how-to-apply", "/news", "/resources", "/events", "/faq", "/contact", "/privacy", "/terms"];
  const [news, resources, events, calls, settings] = await Promise.all([getNews(), getResources(), getEvents(), getFundingCalls(), getSiteSettings()]);
  if (!settings.allowIndexing) return [];
  const dynamicRoutes = [...news.filter(indexable).map((item) => `/news/${item.slug}`), ...resources.filter((item) => !item.href && indexable(item)).map((item) => `/resources/${item.slug}`), ...events.filter(indexable).map((item) => `/events/${item.slug}`), ...calls.filter(indexable).map((item) => `/funding/${item.slug}`)];
  return [...routes, ...dynamicRoutes].map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "weekly" : "monthly", priority: route === "" ? 1 : 0.7 }));
}

function indexable(item: { excludeFromSearch?: boolean | null }) { return !item.excludeFromSearch; }
