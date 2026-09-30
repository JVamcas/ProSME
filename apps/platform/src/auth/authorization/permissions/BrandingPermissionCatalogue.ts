import {
  permissionCodes,
  type StaticPermissionCode,
} from "./PermissionCodes";
import type { PermissionDefinition } from "./PermissionCatalogue";

function define(
  code: StaticPermissionCode,
  label: string,
  description: string,
): PermissionDefinition {
  return { code, description, label };
}

export const brandingPermissionCatalogue: readonly PermissionDefinition[] = [
  define(
    permissionCodes.brandingRead,
    "Read branding",
    "Read platform branding settings and preview the current logo.",
  ),
  define(
    permissionCodes.brandingManage,
    "Manage branding",
    "Upload and replace platform branding assets.",
  ),
];
