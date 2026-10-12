import "server-only";

import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ResourceConflictError } from "@/lib/resource-errors";
import { fundingCallPublicInteractionSchema } from "../api/FundingCallPublicInteractionSchemas";
import { updateFundingCallPublicInteraction } from "../infrastructure/FundingCallPublicInteractionRepository";

export async function setFundingCallPublicInteraction(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
) {
  const input = fundingCallPublicInteractionSchema.parse(values);
  const actor = requirePermission(
    user,
    input.enabled
      ? permissionCodes.fundingCallPublicInteractionEnableAll
      : permissionCodes.fundingCallPublicInteractionDisableAll,
  );
  const updated = await updateFundingCallPublicInteraction(actor.id, id, input);
  if (!updated)
    throw new ResourceConflictError(
      "The funding call changed. Refresh and try again.",
    );
  return updated;
}
