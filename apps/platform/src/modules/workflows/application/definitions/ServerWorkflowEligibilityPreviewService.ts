import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { readWorkflowEligibilityFormPreviews } from "../../infrastructure/WorkflowEligibilityPreviewRepository";

export async function getWorkflowEligibilityFormPreviews(
  user: AuthenticatedUser | null,
  definitionId: string,
  versionId: string,
) {
  requirePermission(user, permissionCodes.workflowDefinitionRead);
  const previews = await readWorkflowEligibilityFormPreviews(definitionId, versionId);
  if (!previews) throw new ResourceNotFoundError("workflow version");
  return previews;
}
