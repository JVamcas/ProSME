import type { ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityExecutionMode,
  EligibilityFailureType,
  EligibilityRule,
} from "./EligibilityRule";

export type EligibilityEvaluationMode = Exclude<
  EligibilityExecutionMode,
  "BOTH"
>;

export type EligibilityEvaluationRule = EligibilityRule & {
  id: string;
  conditionDefinition: ConditionNode;
};

export type EligibilityEvaluationRuleSet = {
  ruleSetId: string;
  versionId: string;
  versionNumber: number;
  rules: EligibilityEvaluationRule[];
};

export type EligibilityFinding = {
  applicantMessage: string;
  failureType: EligibilityFailureType;
  reasonCode: string;
  ruleId: string;
};

export type EligibilityRuleOutcome = EligibilityFinding & {
  passed: boolean;
};

export type EligibilityEvaluationResult = {
  applicantMessages: string[];
  eligible: boolean;
  evaluatedValues: Record<string, JsonValue>;
  hardFailures: EligibilityFinding[];
  manualScreeningRequired: boolean;
  mode: EligibilityEvaluationMode;
  reasonCodes: string[];
  ruleOutcomes: EligibilityRuleOutcome[];
  ruleSetId: string;
  ruleSetVersionId: string;
  ruleSetVersionNumber: number;
  softFailures: EligibilityFinding[];
  warnings: EligibilityFinding[];
};
