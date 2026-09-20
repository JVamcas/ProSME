import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readApplicantDashboard } from "@/db/repositories/ApplicantDashboardRepository";
import type { ApplicantDashboardView } from "./ApplicantDashboardTypes";

export async function getApplicantDashboard(
  user: AuthenticatedUser | null,
): Promise<ApplicantDashboardView> {
  const actor = requirePermission(user, capabilities.applicationReadOwn);
  const projection = await readApplicantDashboard(actor.id);

  return {
    ...projection,
    displayName: actor.displayName,
  };
}
