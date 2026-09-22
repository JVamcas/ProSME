import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readApplicantDashboard } from "@/db/repositories/ApplicantDashboardRepository";
import type { ApplicantDashboardView } from "./ApplicantDashboardTypes";

export async function getApplicantDashboard(
  user: AuthenticatedUser | null,
): Promise<ApplicantDashboardView> {
  const actor = requirePermission(user, permissionCodes.fundingApplicationOwnRead);
  const projection = await readApplicantDashboard(actor.id);

  return {
    ...projection,
    displayName: actor.displayName,
  };
}
