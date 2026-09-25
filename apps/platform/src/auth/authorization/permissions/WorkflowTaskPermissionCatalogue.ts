import { permissionCodes, type StaticPermissionCode } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

function define(
  code: StaticPermissionCode,
  label: string,
  description: string,
): PermissionDefinition {
  return { code, description, label };
}

export const workflowTaskPermissionCatalogue: readonly PermissionDefinition[] = [
  define(
    permissionCodes.workflowTaskAssignedRead,
    "Read assigned tasks",
    "Read workflow tasks assigned to the signed-in user.",
  ),
  define(
    permissionCodes.workflowTaskAssignedProcess,
    "Process assigned tasks",
    "Process an assigned task using its configured actions.",
  ),
  define(
    permissionCodes.workflowTaskAssignedDecide,
    "Decide assigned tasks",
    "Complete an assigned task using its configured decision actions.",
  ),
  define(
    permissionCodes.workflowTaskAssign,
    "Assign tasks",
    "Assign or reassign workflow tasks.",
  ),
  define(
    permissionCodes.workflowQuorumAllRecord,
    "Record quorum participation",
    "Record attendance and chair status for any active workflow stage.",
  ),
  define(
    permissionCodes.workflowCoiAllReview,
    "Review disclosed conflicts",
    "Independently clear or confirm a disclosed conflict for an assigned workflow task.",
  ),
  define(
    permissionCodes.workflowTaskCancelAll,
    "Cancel all tasks",
    "Cancel any active workflow task.",
  ),
  define(
    permissionCodes.workflowTaskReassign,
    "Reassign workflow tasks",
    "Reassign workflow tasks when assignment policy permits.",
  ),
  define(
    permissionCodes.workflowTaskDelegate,
    "Delegate workflow tasks",
    "Delegate workflow tasks when delegation policy permits.",
  ),
  define(
    permissionCodes.workflowTaskAllRead,
    "Read all workflow tasks",
    "Read workflow tasks across all applications.",
  ),
];
