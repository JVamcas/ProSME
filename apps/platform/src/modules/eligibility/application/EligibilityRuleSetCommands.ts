import type { EligibilityRule } from "../domain/EligibilityRule";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export type CreateEligibilityRuleSetCommand = {
  code: string;
  description: string;
  name: string;
};

export type UpdateEligibilityRuleSetDraftCommand = {
  code?: string;
  conditionDefinitions: ConditionGroup[];
  description?: string;
  expectedRowVersion: number;
  name?: string;
  rules: EligibilityRule[];
};

export type EligibilityRuleSetLifecycleCommand = {
  expectedRowVersion: number;
};
