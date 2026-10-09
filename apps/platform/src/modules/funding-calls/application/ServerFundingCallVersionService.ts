import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  createFundingCallReplacement,
  listFundingCallVersions,
  readHistoricalFundingCall,
} from "../infrastructure/FundingCallVersionRepository";
import { toFundingCallView } from "./FundingCallViewMapper";

export async function prepareFundingCallReplacement(
  user: AuthenticatedUser | null,
  id: string,
  expectedRowVersion: number,
) {
  const actor = requirePermission(user, permissionCodes.fundingCallEditDraft);
  const draft = await createFundingCallReplacement(
    actor.id,
    id,
    expectedRowVersion,
  );
  if (!draft)
    throw new ResourceConflictError(
      "The call changed or cannot prepare a replacement. Refresh and retry.",
    );
  return toFundingCallView(draft);
}

export async function getFundingCallVersions(
  user: AuthenticatedUser | null,
  id: string,
  page: number,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  return listFundingCallVersions(id, page);
}

export async function getFundingCallVersion(
  user: AuthenticatedUser | null,
  id: string,
  versionId: string,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  const call = await readHistoricalFundingCall(id, versionId);
  if (!call) throw new ResourceNotFoundError("funding call version");
  return toFundingCallView(call);
}
