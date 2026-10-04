import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  findAllApplications,
  findApplicationById,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
  findOwnedApplicationStatus,
  listOwnedApplications,
} from "./infrastructure/ApplicationRepository";
import type { ApplicationListInput, ApplicationPage } from "./ApplicationTypes";
import {
  decodeApplicationCursor,
  encodeApplicationCursor,
  toApplicationSummary,
} from "./ApplicationRepresentation";

export class ApplicationNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("application draft");
    this.name = "ApplicationNotFoundError";
  }
}

export class ApplicationConflictError extends ResourceConflictError {
  constructor() {
    super(
      "This draft changed in another session. Reload it before saving again.",
    );
    this.name = "ApplicationConflictError";
  }
}

export class ApplicationOpportunityUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("open funding opportunity");
    this.name = "ApplicationOpportunityUnavailableError";
  }
}

export class ApplicationBusinessUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("selected business");
    this.name = "ApplicationBusinessUnavailableError";
  }
}

export class ApplicationBusinessConflictError extends ResourceConflictError {
  constructor() {
    super(
      "This business already has an application for this funding opportunity.",
    );
    this.name = "ApplicationBusinessConflictError";
  }
}

export async function listOwnApplications(
  user: AuthenticatedUser | null,
  input: ApplicationListInput,
): Promise<ApplicationPage> {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  const result = await listOwnedApplications({
    after: input.after ? decodeApplicationCursor(input.after) : undefined,
    limit: input.limit,
    ownerUserId: actor.id,
    status: input.status,
  });
  const hasNextPage = result.items.length > input.limit;
  const items = result.items.slice(0, input.limit);
  return {
    counts: result.counts,
    items: items.map(toApplicationSummary),
    nextCursor: hasNextPage ? encodeApplicationCursor(items.at(-1)!) : null,
    total: result.total,
  };
}

export async function getOwnApplicationStatus(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnRead,
  );
  const application = await findOwnedApplicationStatus(actor.id, id);
  if (!application) throw new ApplicationNotFoundError();
  return toApplicationSummary(application);
}

function requireApplicationReader(user: AuthenticatedUser | null) {
  return requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
}

export async function getApplications(user: AuthenticatedUser | null) {
  const actor = requireApplicationReader(user);
  return can(actor, permissionCodes.fundingApplicationAllRead)
    ? findAllApplications()
    : findApplicationsAssignedTo(actor.id);
}

export async function getApplication(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requireApplicationReader(user);
  return can(actor, permissionCodes.fundingApplicationAllRead)
    ? findApplicationById(id)
    : findAssignedApplicationById(actor.id, id);
}
