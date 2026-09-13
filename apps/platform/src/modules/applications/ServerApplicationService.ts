import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import {
  can,
  requireAnyCapability,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findAllApplications,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
  findApplicationById,
} from "@/db/repositories/ApplicationRepository";

function requireApplicationReader(user: AuthenticatedUser | null) {
  return requireAnyCapability(user, [
    capabilities.applicationReadAssigned,
    capabilities.applicationReadAll,
  ]);
}

export async function getApplications(user: AuthenticatedUser | null) {
  const actor = requireApplicationReader(user);
  return can(actor, capabilities.applicationReadAll)
    ? findAllApplications()
    : findApplicationsAssignedTo(actor.id);
}

export async function getApplication(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requireApplicationReader(user);
  return can(actor, capabilities.applicationReadAll)
    ? findApplicationById(id)
    : findAssignedApplicationById(actor.id, id);
}
