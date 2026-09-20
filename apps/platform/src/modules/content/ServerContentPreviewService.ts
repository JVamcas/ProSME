import "server-only";

import { cmsCapability } from "@/auth/authorization/capabilities";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { previewResource } from "@/auth/authorization/preview-resource";

export function authorizeContentPreview(
  user: AuthenticatedUser | null,
  path: string,
) {
  const capability = cmsCapability(previewResource(path), "read");
  requirePermission(user, capability);
}
