import { getPayload } from "payload";

import config from "@/payload.config";
import { findCmsPrincipal } from "./ensure-cms-principal";

type PrincipalInput = {
  applicationUserId: string;
  displayName: string;
  email: string;
};

export async function syncCmsPrincipal(input: PrincipalInput) {
  const payload = await getPayload({ config });
  const existing = await findCmsPrincipal(payload, input.applicationUserId);
  const data = {
    displayName: input.displayName,
    email: input.email,
    status: "active" as const,
  };
  if (existing) {
    await payload.update({
      collection: "cms-principals",
      id: existing.id,
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
