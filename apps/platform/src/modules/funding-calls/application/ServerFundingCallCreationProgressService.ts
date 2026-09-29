import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import type { FundingCallCreationProgressSaveInput } from "../api/FundingCallSchemas";
import type { FundingCallCreationProgressView } from "../api/FundingCallTransport";
import type { FundingCallCreationProgress } from "../domain/FundingCallCreationProgress";
import {
  readFundingCallCreationProgress,
  saveFundingCallCreationProgress,
} from "../infrastructure/FundingCallCreationProgressRepository";

function view(draft: FundingCallCreationProgress): FundingCallCreationProgressView {
  return {
    currentStep: draft.currentStep,
    id: draft.id,
    rowVersion: draft.rowVersion,
    updatedAt: draft.updatedAt.toISOString(),
    values: draft.values,
  };
}

export async function getFundingCallCreationProgress(
  user: AuthenticatedUser | null,
): Promise<FundingCallCreationProgressView | null> {
  const actor = requirePermission(user, permissionCodes.fundingCallCreate);
  const draft = await readFundingCallCreationProgress(actor.id);
  return draft ? view(draft) : null;
}

export async function saveFundingCallCreationProgressForUser(
  user: AuthenticatedUser | null,
  input: FundingCallCreationProgressSaveInput,
): Promise<FundingCallCreationProgressView> {
  const actor = requirePermission(user, permissionCodes.fundingCallCreate);
  const draft = await saveFundingCallCreationProgress(actor.id, input);

  if (!draft) {
    throw new ResourceConflictError(
      "This funding-call draft changed in another session. Reload before continuing.",
    );
  }

  return view(draft);
}
