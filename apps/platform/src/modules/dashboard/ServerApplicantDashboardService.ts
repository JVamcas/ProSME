import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { ApplicantDashboardView } from "./ApplicantDashboardTypes";
import { readApplicantDashboard } from "./infrastructure/ApplicantDashboardRepository";
import { listOwnedOpenRfiActions } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

export async function getApplicantDashboard(
  user: AuthenticatedUser | null,
): Promise<ApplicantDashboardView> {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  const canReadInformationRequests = can(
    actor,
    permissionCodes.fundingApplicationInformationRequestOwnRead,
  );
  const [projection, urgentRequests] = await Promise.all([
    readApplicantDashboard(actor.id),
    canReadInformationRequests
      ? listOwnedOpenRfiActions(actor)
      : Promise.resolve([]),
  ]);

  return {
    ...projection,
    displayName: actor.displayName,
    urgentRequests,
  };
}
