import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";

export const eligibilityInputModes = ["SELF_CHECK", "SCREENING"] as const;
export type EligibilityInputMode = (typeof eligibilityInputModes)[number];

export const selfCheckAnswerTypes = [
  "BOOLEAN",
  "YES_NO_NA",
  "TEXT",
  "NUMBER",
  "PERCENTAGE",
  "DATE",
  "SINGLE_SELECT",
  "MULTI_SELECT",
] as const;
export type SelfCheckAnswerType = (typeof selfCheckAnswerTypes)[number];

export const eligibilityScreeningSourceKinds = [
  "APPLICATION_FORM_FIELD",
  "FUNDING_CALL_FIELD",
  "WORKFLOW_FORM_FIELD",
  "SCREENING_CHECKLIST_ITEM",
  "DOCUMENT_REQUIREMENT_FACT",
  "MANUAL_ASSESSMENT",
  "INTEGRATION_OUTPUT",
] as const;
export type EligibilityScreeningSourceKind =
  (typeof eligibilityScreeningSourceKinds)[number];

export type SelfCheckQuestionOption = {
  description?: string;
  label: string;
  value: string;
};

export type SelfCheckQuestionDefinition = {
  answerType: SelfCheckAnswerType;
  explanation: string;
  helpText: string;
  options: SelfCheckQuestionOption[];
  prompt: string;
  required: boolean;
};

export type EligibilitySourceBinding = {
  sourceDefinitionId: string;
  sourceKind: EligibilityScreeningSourceKind;
  sourceKey: string;
  sourceVersionId: string | null;
  valuePath: string;
};

export type EligibilityInputDefinition = {
  availableIn: EligibilityInputMode[];
  createdAt: Date;
  createdBy: string;
  groupKey: string | null;
  groupLabel: string | null;
  id: string;
  label: string;
  order: number;
  screening: EligibilitySourceBinding | null;
  selfCheck: SelfCheckQuestionDefinition | null;
  stableKey: string;
  type: ConditionFieldType;
  updatedAt: Date;
  updatedBy: string;
  versionId: string;
};

export type EligibilityInputDependency = {
  reasonCode: string;
  ruleId: string;
};
