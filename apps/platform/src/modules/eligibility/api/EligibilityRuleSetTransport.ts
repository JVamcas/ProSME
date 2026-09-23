import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  EligibilityFieldDescriptor,
  EligibilityFieldRegistryIssue,
  EligibilitySourceDescriptor,
} from "../domain/EligibilityFieldRegistry";
import type {
  EligibilityExecutionMode,
  EligibilityFailureType,
} from "../domain/EligibilityRule";
import type {
  EligibilityRuleSetDefinition,
  EligibilityRuleSetStatus,
  EligibilityRuleSetVersion,
} from "../domain/EligibilityRuleSet";
import type { EligibilityQuestionInputType } from "../domain/EligibilityQuestion";

export type EligibilityQuestionOption = {
  applicantLabel: string;
  code: string;
  id: string;
  inputType: EligibilityQuestionInputType;
  reviewerLabel: string;
};

export type EligibilityBuilderRule = {
  applicantMessage: string;
  condition: ConditionGroup;
  executionMode: EligibilityExecutionMode;
  failureType: EligibilityFailureType;
  id: string;
  order: number;
  questionId: string;
  reasonCode: string;
};

export type EligibilityRuleSetBuilderView = {
  allowedActions: Array<"CLONE" | "PUBLISH" | "RETIRE" | "UPDATE">;
  availableQuestions: EligibilityQuestionOption[];
  definition: EligibilityRuleSetDefinition;
  conditionFields: EligibilityFieldDescriptor[];
  context: {
    fundingCalls: Array<{ id: string; title: string }>;
  };
  registryIssues: EligibilityFieldRegistryIssue[];
  rules: EligibilityBuilderRule[];
  screeningSources: EligibilitySourceDescriptor[];
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
