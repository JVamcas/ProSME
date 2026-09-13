import "server-only";

import { requireApplicantPortalAccess } from "@/auth/authorization/portal-access";
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
  requireApplicantPortalAccess(user);
  return listPublishedFundingOpportunities(input);
}

export async function getFundingOpportunity(
  user: AuthenticatedUser | null,
  id: number,
) {
  requireApplicantPortalAccess(user);
  const opportunity = await findPublishedFundingOpportunity(id);

  if (!opportunity) {
    throw new FundingOpportunityNotFoundError();
  }

  return opportunity;
}
