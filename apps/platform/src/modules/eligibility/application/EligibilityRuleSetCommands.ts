import type { EligibilityRule } from "../domain/EligibilityRule";

export type CreateEligibilityRuleSetCommand = {
  code: string;
  description: string;
  name: string;
};

export type UpdateEligibilityRuleSetDraftCommand = {
  code?: string;
  description?: string;
  expectedRowVersion: number;
  name?: string;
  rules: EligibilityRule[];
};

export type EligibilityRuleSetLifecycleCommand = {
  expectedRowVersion: number;
};
