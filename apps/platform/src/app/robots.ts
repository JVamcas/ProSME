import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/modules/content/content.queries";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.smefund.na";
  const { allowIndexing } = await getSiteSettings();
  return { rules: allowIndexing ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/cms", "/portal", "/api"] }] : [{ userAgent: "*", disallow: "/" }], sitemap: `${base}/sitemap.xml` };
}
