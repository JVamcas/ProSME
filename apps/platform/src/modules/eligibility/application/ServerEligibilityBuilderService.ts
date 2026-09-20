import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type {
  UpdateEligibilityRuleSetBuilderInput,
} from "../api/EligibilityRuleSetTransport";
import type { EligibilityRuleSetListInput } from "../api/EligibilityRuleSetSchemas";
import {
  findEligibilityRuleSetBuilder,
  listEligibilityRuleSets,
} from "../infrastructure/EligibilityBuilderRepository";
import { updateEligibilityRuleSet } from "./ServerEligibilityRuleSetService";

export async function getEligibilityRuleSets(
  user: AuthenticatedUser | null,
  input: EligibilityRuleSetListInput,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  return listEligibilityRuleSets(input);
}

export async function getEligibilityRuleSetBuilder(
  user: AuthenticatedUser | null,
  ruleSetId: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const builder = await findEligibilityRuleSetBuilder(ruleSetId);
  if (!builder) throw new ResourceNotFoundError("eligibility ruleset");
  return builder;
}

export async function saveEligibilityRuleSetBuilder(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: UpdateEligibilityRuleSetBuilderInput,
) {
  const builder = await getEligibilityRuleSetBuilder(user, ruleSetId);
  await updateEligibilityRuleSet(
    user,
    ruleSetId,
    builder.version.id,
    {
      conditionDefinitions: input.rules.map((rule) => rule.condition),
      expectedRowVersion: input.expectedRowVersion,
      rules: input.rules.map((rule) => ({
        applicantMessage: rule.applicantMessage,
        condition: {
          conditionGroupId: rule.condition.id,
          kind: "GROUP",
        },
        executionMode: rule.executionMode,
        failureType: rule.failureType,
        id: rule.id,
        order: rule.order,
        reasonCode: rule.reasonCode,
      })),
    },
  );
  return getEligibilityRuleSetBuilder(user, ruleSetId);
}
