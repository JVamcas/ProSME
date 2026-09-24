import type { MetadataRoute } from "next";

import { getServerEnvironment } from "@/lib/env/server";
import { getSiteSettings } from "@/modules/content/ServerContentQueries";



export default async function robots(): Promise<MetadataRoute.Robots> {
  const environment = getServerEnvironment();
  const { allowIndexing } = await getSiteSettings();

  return {
    rules: allowIndexing
      ? [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/cms", "/portal", "/api"],
          },
        ]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${environment.PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
