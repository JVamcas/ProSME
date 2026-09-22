import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { RequestValidationError } from "@/lib/resource-errors";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import type {
  UpdateEligibilityRuleSetBuilderInput,
} from "../api/EligibilityRuleSetTransport";
import type { EligibilityRuleSetListInput } from "../api/EligibilityRuleSetSchemas";
import {
  findEligibilityRuleSetBuilder,
  listEligibilityRuleSets,
} from "../infrastructure/EligibilityBuilderRepository";
import {
  eligibilityFieldsForExecutionMode,
  type EligibilityFieldDescriptor,
} from "../domain/EligibilityFieldRegistry";
import { updateEligibilityRuleSet } from "./ServerEligibilityRuleSetService";
import { resolveEligibilityFieldRegistry } from "./ServerEligibilityFieldRegistryService";

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
  versionId?: string,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const builder = await findEligibilityRuleSetBuilder(ruleSetId, versionId);
  if (!builder) throw new ResourceNotFoundError("eligibility ruleset");
  const context = await eligibilityBuilderContext(builder.version.id);
  return { ...builder, ...context };
}

export async function eligibilityBuilderContext(versionId: string) {
  const registry = await resolveEligibilityFieldRegistry(versionId);
  return {
    conditionFields: registry.fields,
    context: {
      fundingCalls: registry.fundingCalls,
    },
    registryIssues: registry.issues,
    screeningSources: registry.sources,
  };
}

function validateContextualRules(
  rules: UpdateEligibilityRuleSetBuilderInput["rules"],
  fields: readonly EligibilityFieldDescriptor[],
) {
  if (!rules.length) return;
  if (!fields.length) {
    throw new RequestValidationError(
      "Bind this ruleset version to a draft funding call before configuring rules.",
    );
  }
  const messages = rules.flatMap((rule) =>
    validateConditionGroup(
      rule.condition,
      eligibilityFieldsForExecutionMode(fields, rule.executionMode),
      conditionBuilderOperators,
    ).issues.map((issue) => `${rule.reasonCode}: ${issue.message}`)
  );
  if (messages.length) {
    throw new RequestValidationError(messages.join(" "));
  }
}

export async function saveEligibilityRuleSetBuilder(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: UpdateEligibilityRuleSetBuilderInput,
  versionId?: string,
) {
  const builder = await getEligibilityRuleSetBuilder(user, ruleSetId, versionId);
  validateContextualRules(input.rules, builder.conditionFields);
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
  return getEligibilityRuleSetBuilder(user, ruleSetId, builder.version.id);
}
