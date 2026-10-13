import type { Payload } from "payload";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";

export async function findCmsPrincipal(payload: Payload, applicationUserId: string) {
  const result = await payload.find({
    collection: "cms-principals",
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    where: { applicationUserId: { equals: applicationUserId } },
  });
  return result.docs[0];
}

export async function ensureCmsPrincipal(
  payload: Payload,
  applicationUser: AuthenticatedUser,
) {
  requirePermission(applicationUser, permissionCodes.cmsAccess);
  const existing = await findCmsPrincipal(payload, applicationUser.id);
  if (existing) {
    return refreshCmsPrincipal(payload, existing, applicationUser);
  }

  try {
    return await payload.create({
      collection: "cms-principals",
      overrideAccess: true,
      data: {
        applicationUserId: applicationUser.id,
        displayName: applicationUser.displayName,
        email: applicationUser.email,
        status: "active",
      },
    });
  } catch (error) {
    // Layout and page authentication can race to create the same unique mirror.
    // Recover only a record bound to this application user, never one by email.
    const concurrentPrincipal = await findCmsPrincipal(payload, applicationUser.id);
    if (concurrentPrincipal) {
      return refreshCmsPrincipal(payload, concurrentPrincipal, applicationUser);
    }
    throw error;
  }
}

async function refreshCmsPrincipal(
  payload: Payload,
  principal: NonNullable<Awaited<ReturnType<typeof findCmsPrincipal>>>,
  applicationUser: AuthenticatedUser,
) {
  if (
    principal.status === "active" &&
    principal.displayName === applicationUser.displayName &&
    principal.email === applicationUser.email
  ) {
    return principal;
  }

  // PostgreSQL roles authorize entry. Payload's record is an identity mirror,
  // so stale mirror status must not become a second access-management system.
  return payload.update({
    collection: "cms-principals",
    id: principal.id,
    overrideAccess: true,
    data: {
      displayName: applicationUser.displayName,
      email: applicationUser.email,
      status: "active",
    },
  });
}
