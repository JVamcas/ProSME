import "server-only";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { cmsPermissionCode, permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { CmsPageEditorSlug } from "./CmsPageEditors";
import { findEditorPageId } from "./infrastructure/PayloadPageEditorRepository";

export async function getPageEditorSegments(slug: CmsPageEditorSlug): Promise<string[]> {
  const user = await getCurrentUser();
  requirePermission(user, permissionCodes.cmsAccess);
  requirePermission(user, cmsPermissionCode("pages", "read"));
  const id = await findEditorPageId(slug);

  if (id !== undefined) {
    return ["collections", "pages", String(id)];
  }

  requirePermission(user, cmsPermissionCode("pages", "create"));
  return ["collections", "pages", "create"];
}
