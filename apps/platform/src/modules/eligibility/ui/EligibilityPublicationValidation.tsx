import { Badge } from "@/shared/ui/Badge";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import type { EligibilityBuilderRule } from "../api/EligibilityRuleSetTransport";
import {
  eligibilityFieldsForExecutionMode,
  type EligibilityFieldDescriptor,
  type EligibilityFieldRegistryIssue,
} from "../domain/EligibilityFieldRegistry";

export type EligibilityPublicationValidationResult = {
  issues: string[];
  ready: boolean;
};

export function validateEligibilityPublicationPreview(input: {
  fields: readonly EligibilityFieldDescriptor[];
  registryIssues: readonly EligibilityFieldRegistryIssue[];
  rules: readonly EligibilityBuilderRule[];
}): EligibilityPublicationValidationResult {
  const issues = input.registryIssues.map((issue) => issue.message);
  for (const rule of input.rules) {
    const fields = eligibilityFieldsForExecutionMode(
      input.fields,
      rule.executionMode,
    );
    const validation = validateConditionGroup(
      rule.condition,
      fields,
      conditionBuilderOperators,
    );
    issues.push(...validation.issues.map(
      (issue) => `${rule.reasonCode}: ${issue.message}`,
    ));
  }
  if (!input.fields.length && !issues.length) {
    issues.push(
      "Bind this draft ruleset to a draft funding call before publishing it.",
    );
  }
  const uniqueIssues = [...new Set(issues)];
  return { issues: uniqueIssues, ready: uniqueIssues.length === 0 };
}

export function EligibilityPublicationValidation({
  result,
}: {
  result: EligibilityPublicationValidationResult;
}) {
  return (
    <></>
  );
}
