import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { can, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readAdminDashboard } from "@/db/repositories/AdminDashboardRepository";
import type {
  AdminDashboardPeriod,
  AdminDashboardView,
} from "./AdminDashboardTypes";

function visibilityFor(user: AuthenticatedUser) {
  if (can(user, capabilities.applicationReadAll)) return "all" as const;
  if (can(user, capabilities.applicationReadAssigned)) {
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
  const actor = requirePermission(user, capabilities.adminAccess);
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
