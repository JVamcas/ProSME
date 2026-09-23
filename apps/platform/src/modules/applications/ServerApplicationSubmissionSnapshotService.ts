import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAnyPermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { verifySubmissionSnapshotIntegrity } from "./domain/ApplicationSubmissionSnapshot";
import { readSubmissionSnapshotAndAudit } from "./infrastructure/ApplicationSubmissionSnapshotRepository";

export async function getApplicationSubmissionSnapshot(
  user: AuthenticatedUser | null,
  applicationId: string,
  correlationId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.fundingApplicationOwnRead,
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  const snapshot = await readSubmissionSnapshotAndAudit({
    actorId: actor.id,
    allowAll: can(actor, permissionCodes.fundingApplicationAllRead),
    allowAssigned: can(actor, permissionCodes.workflowTaskAssignedRead),
    allowOwn: can(actor, permissionCodes.fundingApplicationOwnRead),
    applicationId,
    correlationId,
  });
  if (!snapshot) {
    throw new ResourceNotFoundError("application submission snapshot");
  }
  if (!verifySubmissionSnapshotIntegrity(snapshot)) {
    throw new ResourceConflictError(
      "The application submission snapshot failed integrity verification.",
    );
  }
  return {
    applicationId: snapshot.applicationId,
    integrityHash: snapshot.integrityHash,
    schemaVersion: snapshot.schemaVersion,
    snapshot: snapshot.snapshotContent,
    submittedAt: snapshot.submittedAt.toISOString(),
  };
}
