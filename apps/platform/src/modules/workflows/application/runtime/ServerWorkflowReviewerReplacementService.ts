import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  replaceWorkflowReviewer,
  type ReplaceReviewerInput,
} from "../../infrastructure/WorkflowReviewerReplacementRepository";

export async function replaceReviewer(
  user: AuthenticatedUser | null,
  input: Omit<ReplaceReviewerInput, "actorId">,
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowTaskReassign,
  );
  const replacement = await replaceWorkflowReviewer({
    ...input,
    actorId: actor.id,
  });
  if (!replacement) {
    throw new ResourceConflictError(
      "The reviewer slot changed or the replacement is not eligible.",
    );
  }
  return replacement;
}
