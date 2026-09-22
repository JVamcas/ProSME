import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readAdminApplication,
  readAdminApplications,
} from "@/db/repositories/AdminApplicationRepository";
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
): Promise<AdminApplicationPage> {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  const projection = await readAdminApplications({
    actorId: actor.id,
    cursor: input.after
      ? decodeAdminApplicationCursor(input.after)
      : undefined,
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
