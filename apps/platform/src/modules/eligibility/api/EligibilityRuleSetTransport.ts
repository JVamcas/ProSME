import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type {
  EligibilityExecutionMode,
  EligibilityFailureType,
} from "../domain/EligibilityRule";
import type {
  EligibilityRuleSetDefinition,
  EligibilityRuleSetStatus,
  EligibilityRuleSetVersion,
} from "../domain/EligibilityRuleSet";

export type EligibilityBuilderRule = {
  applicantMessage: string;
  condition: ConditionGroup;
  executionMode: EligibilityExecutionMode;
  failureType: EligibilityFailureType;
  id: string;
  order: number;
  reasonCode: string;
};

export type EligibilityRuleSetBuilderView = {
  allowedActions: Array<"CLONE" | "PUBLISH" | "RETIRE" | "UPDATE">;
  definition: EligibilityRuleSetDefinition;
  conditionFields: ConditionFieldDefinition[];
  context: {
    fundingCalls: Array<{ id: string; title: string }>;
  };
  rules: EligibilityBuilderRule[];
  version: EligibilityRuleSetVersion;
  versions: EligibilityRuleSetVersion[];
};

export type EligibilityRuleSetSummary = {
  code: string;
  description: string;
  fundingCalls: Array<{
    id: string;
    reference: string;
    title: string;
  }>;
  id: string;
  status: EligibilityRuleSetStatus;
  version: number;
  versionId: string;
  versionRowVersion: number;
  name: string;
  ruleCount: number;
  updatedAt: string;
};

export type EligibilityRuleSetPage = {
  items: EligibilityRuleSetSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PublishedEligibilityRuleSetOption = {
  ruleSetCode: string;
  ruleSetId: string;
  ruleSetName: string;
  versionId: string;
  versionNumber: number;
  status: "DRAFT" | "PUBLISHED";
};

export type CreateEligibilityRuleSetInput = {
  code: string;
  description: string;
  name: string;
};

export type UpdateEligibilityRuleSetDefinitionInput =
  CreateEligibilityRuleSetInput;

export type UpdateEligibilityRuleSetBuilderInput = {
  expectedRowVersion: number;
  rules: EligibilityBuilderRule[];
};
