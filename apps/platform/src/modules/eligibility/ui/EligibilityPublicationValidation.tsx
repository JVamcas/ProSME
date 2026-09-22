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
    <section
      aria-labelledby="eligibility-publication-validation-heading"
      className="rounded-xl border border-brand-navy/15 bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="font-semibold text-brand-navy"
          id="eligibility-publication-validation-heading"
        >
          Publication validation
        </h3>
        <Badge variant={result.ready ? "success" : "danger"}>
          {result.ready ? "Ready" : "Blocked"}
        </Badge>
      </div>
      {result.ready ? (
        <p className="mt-2 text-sm text-brand-navy/70">
          All configured field references resolve for their execution modes.
        </p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-red-700" role="alert">
          {result.issues.map((issue) => <li key={issue}>{issue}</li>)}
        </ul>
      )}
    </section>
  );
}
