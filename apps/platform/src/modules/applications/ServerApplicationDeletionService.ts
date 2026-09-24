import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { deleteOwnedApplicationDraft } from "./infrastructure/ApplicationDeletionRepository";

export async function deleteOwnApplicationDraft(
  user: AuthenticatedUser | null,
  applicationId: string,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationDraftOwnDelete,
  );
  const result = await deleteOwnedApplicationDraft({
    actorId: actor.id,
    applicationId,
    correlationId,
  });
  if (result === "not_found") {
    throw new ResourceNotFoundError("application draft");
  }
  if (result === "not_draft") {
    throw new ResourceConflictError(
      "Only an unsubmitted draft application can be deleted.",
    );
  }
  return { id: applicationId };
}
