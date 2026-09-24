export const eligibilityFailureTypes = [
  "HARD_FAIL",
  "SOFT_FAIL",
  "WARNING",
] as const;

export type EligibilityFailureType =
  (typeof eligibilityFailureTypes)[number];

export const eligibilityExecutionModes = [
  "SELF_CHECK",
  "SCREENING",
  "BOTH",
] as const;

export type EligibilityExecutionMode =
  (typeof eligibilityExecutionModes)[number];

export type EligibilityConditionReference =
  | {
      kind: "GROUP";
      conditionGroupId: string;
    }
  | {
      kind: "CONDITION";
      conditionGroupId: string;
      conditionId: string;
    };

export type EligibilityRule = {
  id?: string;
  condition: EligibilityConditionReference;
  executionMode: EligibilityExecutionMode;
  failureType: EligibilityFailureType;
  applicantMessage: string;
  order: number;
  reasonCode: string;
};
