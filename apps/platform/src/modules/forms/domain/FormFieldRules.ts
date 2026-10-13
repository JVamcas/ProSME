import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export const formRuleValidationModes = ["DRAFT", "SUBMIT"] as const;
export type FormRuleValidationMode = (typeof formRuleValidationModes)[number];

export type FormValidationRuleSettings = {
  message: string;
  modes: FormRuleValidationMode[];
  missing: "DEFER_ON_DRAFT" | "REJECT";
};

export type FormFieldRules = {
  validationCondition?: ConditionGroup | null;
  editableCondition?: ConditionGroup | null;
  requiredCondition?: ConditionGroup | null;
  validationSettings?: FormValidationRuleSettings | null;
};

export const defaultFormValidationRuleSettings: FormValidationRuleSettings = {
  message: "This answer does not satisfy its configured rule.",
  modes: ["DRAFT", "SUBMIT"],
  missing: "DEFER_ON_DRAFT",
};
