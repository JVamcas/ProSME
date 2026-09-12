import { getPayload } from "payload";

import config from "@/payload.config";

type PrincipalInput = {
  applicationUserId: string;
  displayName: string;
  email: string;
};

export async function syncCmsPrincipal(input: PrincipalInput) {
  const payload = await getPayload({ config });
  const existing = await payload.find({
    collection: "cms-principals",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { applicationUserId: { equals: input.applicationUserId } },
  });
  const data = { displayName: input.displayName, email: input.email, status: "active" as const };
  if (existing.docs[0]) {
    await payload.update({
      collection: "cms-principals",
      id: existing.docs[0].id,
      overrideAccess: true,
      data,
    });
  } else {
    await payload.create({
      collection: "cms-principals",
      overrideAccess: true,
      data: { applicationUserId: input.applicationUserId, ...data },
    });
  }
  payload.logger.info(`Synchronized CMS principal for ${input.email}`);
}
