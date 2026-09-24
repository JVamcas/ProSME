import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import {
  findPublicFundingCallById,
  listPublicFundingCalls,
} from "./application/ServerPublicFundingCallService";
import type { PublicFundingCallListInput } from "./api/PublicFundingCallTransport";

export class FundingOpportunityNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("funding opportunity");
    this.name = "FundingOpportunityNotFoundError";
  }
}

export async function listFundingOpportunities(
  user: AuthenticatedUser | null,
  input: PublicFundingCallListInput,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  return listPublicFundingCalls(input);
}

export async function getFundingOpportunity(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  const opportunity = await findPublicFundingCallById(id);

  if (!opportunity) {
    throw new FundingOpportunityNotFoundError();
  }

  return opportunity;
}
