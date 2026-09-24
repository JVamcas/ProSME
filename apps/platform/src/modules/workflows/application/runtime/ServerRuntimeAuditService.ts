import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { listRuntimeAuditTrail } from "../../infrastructure/RuntimeAuditRepository";

export function getRuntimeAuditTrail(
  user: AuthenticatedUser | null,
  workflowInstanceId: string,
) {
  const actor = requireAuthenticatedUser(user);
  requirePermission(actor, permissionCodes.auditRead);
  return listRuntimeAuditTrail(workflowInstanceId);
}
