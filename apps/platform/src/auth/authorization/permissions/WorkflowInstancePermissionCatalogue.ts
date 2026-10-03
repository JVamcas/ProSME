import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

export const workflowInstancePermissionCatalogue: readonly PermissionDefinition[] = [
  {
    code: permissionCodes.workflowInstanceAssignedRead,
    label: "Read progress of workflows with an assigned task",
    description: "Read internal workflow progress through a task assigned to the signed-in user, after task access and conflict of interest checks.",
  },
  {
    code: permissionCodes.workflowInstanceAllRead,
    label: "Read all workflow instance progress",
    description: "Read internal stage and task assignment progress for any submitted application.",
  },
];
