import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  recordQuorumParticipation,
  type RecordQuorumParticipationInput,
} from "../../infrastructure/WorkflowQuorumRepository";

export async function recordWorkflowQuorumParticipation(
  user: AuthenticatedUser | null,
  input: Omit<RecordQuorumParticipationInput, "actorId">,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowQuorumAllRecord,
  );
  const recorded = await recordQuorumParticipation({
    ...input,
    actorId: actor.id,
  });
  if (!recorded) {
    throw new ResourceNotFoundError("active quorum participant");
  }
  return { recorded: true };
}
