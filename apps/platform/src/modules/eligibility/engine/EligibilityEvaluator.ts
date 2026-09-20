import { evaluateConditionNode } from "@/modules/conditions/engine/ConditionGroupEngine";
import {
  resolveWorkflowConditionNodeValues,
  type WorkflowDataContext,
} from "@/modules/conditions/engine/WorkflowDataResolver";
import type {
  EligibilityEvaluationMode,
  EligibilityEvaluationResult,
  EligibilityEvaluationRule,
  EligibilityEvaluationRuleSet,
  EligibilityFinding,
} from "../domain/EligibilityEvaluation";

function appliesToMode(
  rule: EligibilityEvaluationRule,
  mode: EligibilityEvaluationMode,
) {
  return rule.executionMode === "BOTH" || rule.executionMode === mode;
}

function finding(rule: EligibilityEvaluationRule): EligibilityFinding {
  return {
    applicantMessage: rule.applicantMessage,
    failureType: rule.failureType,
    reasonCode: rule.reasonCode,
    ruleId: rule.id,
  };
}

export function evaluateEligibilityRuleSet(
  ruleSet: EligibilityEvaluationRuleSet,
  mode: EligibilityEvaluationMode,
  data: WorkflowDataContext,
): EligibilityEvaluationResult {
  const hardFailures: EligibilityFinding[] = [];
  const softFailures: EligibilityFinding[] = [];
  const warnings: EligibilityFinding[] = [];
  const findings: EligibilityFinding[] = [];
  const ruleOutcomes: EligibilityEvaluationResult["ruleOutcomes"] = [];

  const orderedRules = [...ruleSet.rules].sort(
    (left, right) => left.order - right.order,
  );
  for (const rule of orderedRules) {
    if (!appliesToMode(rule, mode)) continue;
    const values = resolveWorkflowConditionNodeValues(
      rule.conditionDefinition,
      data,
    );
    const result = evaluateConditionNode(rule.conditionDefinition, values);
    ruleOutcomes.push({ ...finding(rule), passed: result.passed });
    if (result.passed) continue;

    const failed = finding(rule);
    findings.push(failed);
    if (rule.failureType === "HARD_FAIL") hardFailures.push(failed);
    if (rule.failureType === "SOFT_FAIL") softFailures.push(failed);
    if (rule.failureType === "WARNING") warnings.push(failed);
  }

  return {
    applicantMessages: findings.map((item) => item.applicantMessage),
    eligible: hardFailures.length === 0,
    hardFailures,
    manualScreeningRequired: softFailures.length > 0,
    mode,
    reasonCodes: findings.map((item) => item.reasonCode),
    ruleOutcomes,
    ruleSetId: ruleSet.ruleSetId,
    ruleSetVersionId: ruleSet.versionId,
    ruleSetVersionNumber: ruleSet.versionNumber,
    softFailures,
    warnings,
  };
}
