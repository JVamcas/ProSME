import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { FundingOpportunityListInput } from "./FundingOpportunityTypes";
import {
  findPublishedFundingOpportunity,
  listPublishedFundingOpportunities,
} from "./ServerFundingOpportunityIntegration";

export class FundingOpportunityNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("funding opportunity");
    this.name = "FundingOpportunityNotFoundError";
  }
}

export async function listFundingOpportunities(
  user: AuthenticatedUser | null,
  input: FundingOpportunityListInput,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  return listPublishedFundingOpportunities(input);
}

export async function getFundingOpportunity(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  const opportunity = await findPublishedFundingOpportunity(id);

  if (!opportunity) {
    throw new FundingOpportunityNotFoundError();
  }

  return opportunity;
}
