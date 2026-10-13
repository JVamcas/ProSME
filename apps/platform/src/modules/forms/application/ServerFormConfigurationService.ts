import { readFormSearchContent } from "../infrastructure/FormSearchRepository";
import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import { requireAnyPermission } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  getFormRuntime,
  listBindableFormVersions,
} from "../infrastructure/FormRepository";

function authorize(user: AuthenticatedUser | null) {
  requireAnyPermission(user, [
    permissionCodes.workflowFormRead,
    permissionCodes.workflowDefinitionRead,
  ]);
}

export async function getTaskFormOptions(user: AuthenticatedUser | null) {
  authorize(user);
  return listBindableFormVersions("APPLICATION_REVIEW");
}

export async function getConfiguredFormPreview(
  user: AuthenticatedUser | null,
  versionId: string,
) {
  authorize(user);
  const form = await getFormRuntime(versionId, true);
  if (!form) throw new ResourceNotFoundError("form version");
  return form;
}

export async function getTaskFormSearchContent(
  user: AuthenticatedUser | null,
  versionIds: string[],
) {
  authorize(user);
  return readFormSearchContent([...new Set(versionIds)]);
}
