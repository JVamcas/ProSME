import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedBusiness,
  deleteOwnedBusiness,
  findOwnedBusiness,
  listOwnedBusinesses,
  updateOwnedBusiness,
} from "@/db/repositories/BusinessRepository";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { BusinessProfileInput } from "./BusinessSchemas";
import type { BusinessView } from "./BusinessTypes";

export class BusinessNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("business");
    this.name = "BusinessNotFoundError";
  }
}

function view(
  business: NonNullable<Awaited<ReturnType<typeof findOwnedBusiness>>>,
): BusinessView {
  return {
    ...business,
    establishedYear: business.establishedYear?.toString() ?? "",
    employeeCount: business.employeeCount?.toString() ?? "",
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
  };
}

export async function listBusinesses(user: AuthenticatedUser | null) {
  const actor = requireCapability(user, capabilities.businessReadOwn);
  return (await listOwnedBusinesses(actor.id)).map(view);
}

async function loadOwnedBusiness(ownerUserId: string, id: string) {
  const business = await findOwnedBusiness(ownerUserId, id);
  if (!business) throw new BusinessNotFoundError();
  return view(business);
}

export async function getBusiness(user: AuthenticatedUser | null, id: string) {
  const actor = requireCapability(user, capabilities.businessReadOwn);
  return loadOwnedBusiness(actor.id, id);
}

export async function createBusiness(
  user: AuthenticatedUser | null,
  input: BusinessProfileInput,
) {
  const actor = requireCapability(user, capabilities.businessUpdateOwn);
  const id = await createOwnedBusiness(actor.id, input);
  return loadOwnedBusiness(actor.id, id);
}

export async function updateBusiness(
  user: AuthenticatedUser | null,
  id: string,
  input: BusinessProfileInput,
) {
  const actor = requireCapability(user, capabilities.businessUpdateOwn);
  const updatedId = await updateOwnedBusiness(actor.id, id, input);
  if (!updatedId) throw new BusinessNotFoundError();
  return loadOwnedBusiness(actor.id, updatedId);
}

export async function deleteBusiness(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requireCapability(user, capabilities.businessUpdateOwn);
  if (!(await deleteOwnedBusiness(actor.id, id))) {
    throw new BusinessNotFoundError();
  }
}
