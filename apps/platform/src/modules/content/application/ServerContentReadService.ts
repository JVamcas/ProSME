import "server-only";

import { connection } from "next/server";
import { draftMode } from "next/headers";
import { cache } from "react";
import type { Where } from "payload";
import { getCurrentUser } from "@/auth/authorization/current-user";
import {
  cmsPermissionCode,
  type CmsPermissionResource,
} from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";

export const getContentReadMode = cache(async function getContentReadMode(
  resource: CmsPermissionResource,
) {
  // Build/prerender must stop here, before Payload or the persistent cache.
  // Runtime always uses real data, even if a build flag leaks into its env.
  await connection();
  const requested = (await draftMode()).isEnabled;
  const draft = requested
    ? can(await getCurrentUser(), cmsPermissionCode(resource, "read"))
    : false;
  const where: Where = draft ? {} : { _status: { equals: "published" } };
  return { draft, where };
});
