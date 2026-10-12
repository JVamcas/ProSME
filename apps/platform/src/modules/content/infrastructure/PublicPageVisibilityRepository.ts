import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { normalizePublicPageVisibility } from "../domain/PublicPageVisibility";
import { cachePublishedContent } from "./PublishedContentCache";

export const readPublicPageVisibility = cachePublishedContent(
  async () => {
    const payload = await getPayload({ config });
    const document = await payload.findGlobal({
      slug: "public-page-visibility",
      depth: 0,
      draft: false,
      select: { visibility: true },
      overrideAccess: true,
    });
    return normalizePublicPageVisibility(document.visibility);
  },
  "public-page-visibility",
  ["public-page-visibility"],
);
