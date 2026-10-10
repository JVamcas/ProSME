import {
  can,
  PermissionDeniedError,
  requirePermission,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

// CB0 context contract. CB5 operations must invoke this after loading only case
// assignment metadata and before reading any history or recording a resolution.
export function requireChatbotEscalationAccess(
  user: AuthenticatedUser | null,
  caseAssignment: string | null,
  action: "read" | "resolve",
) {
  const all =
    action === "read"
      ? permissionCodes.chatbotEscalationReadAll
      : permissionCodes.chatbotEscalationResolveAll;
  const assigned =
    action === "read"
      ? permissionCodes.chatbotEscalationReadAssigned
      : permissionCodes.chatbotEscalationResolveAssigned;
  if (can(user, all)) return requirePermission(user, all);
  const actor = requirePermission(user, assigned);
  if (caseAssignment !== actor.id) throw new PermissionDeniedError(assigned);
  return actor;
}
