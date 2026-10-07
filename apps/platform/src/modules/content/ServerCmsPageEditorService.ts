import "server-only";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { cmsPermissionCode, permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import { findAboutEditorPageId } from "./infrastructure/PayloadPageEditorRepository";

export async function getAboutEditorSegments(): Promise<string[]> {
  const user = await getCurrentUser();
  requirePermission(user, permissionCodes.cmsAccess);
  requirePermission(user, cmsPermissionCode("pages", "read"));
  const id = await findAboutEditorPageId();

  if (id !== undefined) {
    return ["collections", "pages", String(id)];
  }

  requirePermission(user, cmsPermissionCode("pages", "create"));
  return ["collections", "pages", "create"];
}
