import "server-only";

import { getPayload } from "payload";
import configPromise from "@payload-config";

// The editor service checks the platform grants before this private read.
export async function findAboutEditorPageId(): Promise<number | undefined> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "pages",
    depth: 0,
    draft: true,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    // Payload always includes id in an inclusion projection.
    select: { slug: true },
    where: { slug: { equals: "about" } },
  });

  return result.docs[0]?.id;
}
