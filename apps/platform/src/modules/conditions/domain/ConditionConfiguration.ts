import type { Operator } from "./Operator";

export const conditionFieldTypes = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
] as const;

export type ConditionFieldType = (typeof conditionFieldTypes)[number];

export type ConditionFieldDefinition = {
  key: string;
  label: string;
  type: ConditionFieldType;
};

export type ConditionValueShape = "NONE" | "SINGLE" | "LIST" | "RANGE";

export type ConditionOperatorDefinition = {
  allowedFieldTypes: readonly ConditionFieldType[];
  code: Operator;
  label: string;
  valueShape: ConditionValueShape;
};
