import "server-only";
import { readAdminApplicationFilterOptions } from "./infrastructure/AdminApplicationFilterOptionsRepository";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readAdminApplication,
  readAdminApplications,
} from "@/modules/applications/infrastructure/AdminApplicationRepository";
import {
  decodeAdminApplicationCursor,
  encodeAdminApplicationCursor,
} from "./AdminApplicationCursor";
import type {
  AdminApplicationListInput,
  AdminApplicationPage,
} from "./ApplicationTypes";

export async function listAdminApplications(
  user: AuthenticatedUser | null,
  input: AdminApplicationListInput,
  options: { includeTotal?: boolean } = {},
): Promise<AdminApplicationPage> {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  const projection = await readAdminApplications({
    ...options,
    actorId: actor.id,
    cursor: input.after ? decodeAdminApplicationCursor(input.after) : undefined,
    filters: input,
    visibility: can(actor, permissionCodes.fundingApplicationAllRead)
      ? "all"
      : "assigned",
  });
  const hasNextPage = projection.items.length > input.limit;
  const items = projection.items.slice(0, input.limit);
  return {
    items,
    nextCursor: hasNextPage
      ? encodeAdminApplicationCursor(items.at(-1)!)
      : null,
    total: projection.total,
  };
}

export async function getAdminApplicationOverview(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  return readAdminApplication({
    actorId: actor.id,
    applicationId,
    visibility: can(actor, permissionCodes.fundingApplicationAllRead)
      ? "all"
      : "assigned",
  });
}

export async function getAdminApplicationFilterOptions(
  user: AuthenticatedUser | null,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  return readAdminApplicationFilterOptions({
    actorId: actor.id,
    visibility: can(actor, permissionCodes.fundingApplicationAllRead)
      ? "all"
      : "assigned",
  });
}
