import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readWorkflowProgress } from "../../infrastructure/WorkflowProgressRepository";

export async function getWorkflowProgress(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  requirePermission(user, permissionCodes.workflowInstanceAllRead);
  return readWorkflowProgress(applicationId);
}
