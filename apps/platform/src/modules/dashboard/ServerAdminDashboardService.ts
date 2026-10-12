import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { requireOperationsPortalAccess } from "@/auth/authorization/portal-access";
import type { AuthenticatedUser } from "@/auth/types";
import { readAdminDashboard } from "@/modules/dashboard/infrastructure/AdminDashboardRepository";
import type {
  AdminDashboardPeriod,
  AdminDashboardView,
} from "./AdminDashboardTypes";

function visibilityFor(user: AuthenticatedUser) {
  if (can(user, permissionCodes.fundingApplicationAllRead))
    return "all" as const;
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
  const since = periodStart(period, now);
  const projection = await readAdminDashboard({
    actorId: actor.id,
    since,
    until: now,
    visibility,
  });
  return {
    ...projection,
    period,
    submissionWindow: { from: since?.toISOString() ?? null, to: now.toISOString() },
    visibility,
  };
}
