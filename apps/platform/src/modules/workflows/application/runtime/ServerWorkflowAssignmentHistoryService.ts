import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readAssignmentHistory } from "../../infrastructure/WorkflowAssignmentHistoryRepository";

export async function getAssignmentHistory(
  user: AuthenticatedUser | null,
  taskId: string,
  input: { after?: number; limit: number },
) {
  const actor = requirePermission(user, permissionCodes.auditRead);
  requirePermission(actor, permissionCodes.workflowTaskAllRead);
  const projection = await readAssignmentHistory(taskId, input);
  const hasNextPage = projection.items.length > input.limit;
  const items = projection.items.slice(0, input.limit);
  return {
    items,
    nextAfter: hasNextPage ? items.at(-1)!.sequence : null,
    total: projection.total,
  };
}
