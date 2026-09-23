import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { RequestValidationError } from "@/lib/resource-errors";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
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
import { listAvailableEligibilityQuestions } from "../infrastructure/EligibilityQuestionRepository";
import { questionConditionType } from "../domain/EligibilityQuestion";

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
  const [registry, availableQuestions] = await Promise.all([
    resolveEligibilityFieldRegistry(versionId),
    listAvailableEligibilityQuestions(),
  ]);
  return {
    availableQuestions,
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

function referencedEligibilityFields(group: ConditionGroup): string[] {
  return group.children.flatMap((child) => {
    if (child.kind === "GROUP") return referencedEligibilityFields(child);
    if (
      child.leftOperand.kind === "FIELD"
      && child.leftOperand.key.startsWith("eligibility.")
    ) {
      return [child.leftOperand.key];
    }
    return [];
  });
}

function fieldsForSelectedQuestions(
  rules: UpdateEligibilityRuleSetBuilderInput["rules"],
  builder: Awaited<ReturnType<typeof getEligibilityRuleSetBuilder>>,
) {
  const questionsById = new Map(
    builder.availableQuestions.map((question) => [question.id, question]),
  );
  const issues: string[] = [];
  const selectedFields = rules.flatMap((rule): EligibilityFieldDescriptor[] => {
    const question = questionsById.get(rule.questionId);
    if (!question) {
      issues.push(`${rule.reasonCode}: select an available eligibility question.`);
      return [];
    }
    const selectedKey = `eligibility.${question.code}`;
    const referenced = new Set(referencedEligibilityFields(rule.condition));
    if (!referenced.has(selectedKey)) {
      issues.push(
        `${rule.reasonCode}: the condition must use the selected eligibility question.`,
      );
    }
    const otherQuestions = [...referenced].filter((key) => key !== selectedKey);
    if (otherQuestions.length) {
      issues.push(
        `${rule.reasonCode}: a rule can use only its selected eligibility question.`,
      );
    }
    return [{
      availableIn: ["SELF_CHECK", "SCREENING"],
      key: selectedKey,
      label: question.reviewerLabel,
      screeningSource: {
        sourceDefinitionId: question.id,
        sourceKey: question.code,
        sourceKind: "ELIGIBILITY_QUESTION_RESPONSE",
        sourceVersionId: builder.version.id,
        valuePath: "value",
      },
      sourceDefinitionId: question.id,
      sourceKind: "ELIGIBILITY_INPUT",
      sourceVersionId: builder.version.id,
      type: questionConditionType(question.inputType),
    }];
  });
  if (issues.length) throw new RequestValidationError(issues.join(" "));
  const selectedKeys = new Set(selectedFields.map((field) => field.key));
  return [
    ...builder.conditionFields.filter((field) => !selectedKeys.has(field.key)),
    ...selectedFields,
  ];
}

export async function saveEligibilityRuleSetBuilder(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: UpdateEligibilityRuleSetBuilderInput,
  versionId?: string,
) {
  const builder = await getEligibilityRuleSetBuilder(user, ruleSetId, versionId);
  const fields = fieldsForSelectedQuestions(input.rules, builder);
  validateContextualRules(input.rules, fields);
  await updateEligibilityRuleSet(
    user,
    ruleSetId,
    builder.version.id,
    {
      conditionDefinitions: input.rules.map((rule) => rule.condition),
      expectedRowVersion: input.expectedRowVersion,
      questionIds: [...new Set(input.rules.map((rule) => rule.questionId))],
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
