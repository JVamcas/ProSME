import "server-only";

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { previewResource } from "@/auth/authorization/preview-resource";

export function authorizeContentPreview(
  user: AuthenticatedUser | null,
  path: string,
) {
  const capability = cmsPermissionCode(previewResource(path), "read");
  requirePermission(user, capability);
}
