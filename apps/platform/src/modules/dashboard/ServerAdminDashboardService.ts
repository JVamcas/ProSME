import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { requireOperationsPortalAccess } from "@/auth/authorization/portal-access";
import type { AuthenticatedUser } from "@/auth/types";
import { readAdminDashboard } from "@/db/repositories/AdminDashboardRepository";
import type {
  AdminDashboardPeriod,
  AdminDashboardView,
} from "./AdminDashboardTypes";

function visibilityFor(user: AuthenticatedUser) {
  if (can(user, permissionCodes.fundingApplicationAllRead)) return "all" as const;
  if (can(user, permissionCodes.workflowTaskAssignedRead)) {
    return "assigned" as const;
  }
  return "none" as const;
}

function periodStart(period: AdminDashboardPeriod, now: Date) {
  if (period === "all") return null;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Number(period));
  return start;
}

export async function getAdminDashboard(
  user: AuthenticatedUser | null,
  period: AdminDashboardPeriod,
  now = new Date(),
): Promise<AdminDashboardView> {
  const actor = requireOperationsPortalAccess(user);
  const visibility = visibilityFor(actor);
  const projection = await readAdminDashboard({
    actorId: actor.id,
    since: periodStart(period, now),
    visibility,
  });
  return {
    ...projection,
    metrics: {
      ...projection.metrics,
      informationRequests: null,
    },
    period,
    visibility,
  };
}
