import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { preflightOwnedApplication } from "../infrastructure/ApplicationPreflightRepository";

export async function preflightOwnApplication(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationSubmit,
  );
  const result = await preflightOwnedApplication({
    actorId: actor.id,
    applicationId,
  });
  if (!result) throw new ResourceNotFoundError("application draft");
  return result;
}
