import { permissionCodes } from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

export const workflowInstancePermissionCatalogue: readonly PermissionDefinition[] = [
  {
    code: permissionCodes.workflowInstanceAllRead,
    label: "Read all workflow instance progress",
    description: "Read internal stage and task assignment progress for any submitted application.",
  },
];
