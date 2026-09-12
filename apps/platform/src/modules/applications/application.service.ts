import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findAllApplications,
  findApplicationById,
} from "@/db/repositories/application.repository";

export async function getApplications(user: AuthenticatedUser | null) {
  requireCapability(user, capabilities.adminAccess);
  return findAllApplications();
}

export async function getApplication(
  user: AuthenticatedUser | null,
  id: string,
) {
  requireCapability(user, capabilities.adminAccess);
  return findApplicationById(id);
}
