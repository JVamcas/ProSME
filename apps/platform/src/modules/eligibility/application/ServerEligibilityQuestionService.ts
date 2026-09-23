import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import type {
  EligibilityQuestionInput,
  EligibilityQuestionListInput,
  EligibilityQuestionUpdateInput,
} from "../api/EligibilityQuestionSchemas";
import {
  insertEligibilityQuestion,
  listEligibilityQuestions,
  updateEligibilityQuestion,
} from "../infrastructure/EligibilityQuestionRepository";

export function getEligibilityQuestions(
  user: AuthenticatedUser | null,
  input: EligibilityQuestionListInput,
) {
  requirePermission(user, permissionCodes.eligibilityQuestionRead);
  return listEligibilityQuestions(input);
}

export function createEligibilityQuestion(
  user: AuthenticatedUser | null,
  input: EligibilityQuestionInput,
) {
  const actor = requirePermission(user, permissionCodes.eligibilityQuestionCreate);
  return insertEligibilityQuestion({ actorId: actor.id, definition: input });
}

export async function editEligibilityQuestion(
  user: AuthenticatedUser | null,
  questionId: string,
  input: EligibilityQuestionUpdateInput,
) {
  const actor = requirePermission(user, permissionCodes.eligibilityQuestionUpdate);
  const updated = await updateEligibilityQuestion({
    actorId: actor.id,
    definition: input,
    questionId,
  });
  if (!updated) {
    throw new ResourceConflictError(
      "The eligibility question changed. Refresh and try again.",
    );
  }
  return updated;
}
