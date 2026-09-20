import type { Operator } from "../../domain/Operator";

export const conditionFieldTypes = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
] as const;

export type ConditionFieldType = (typeof conditionFieldTypes)[number];

export type ConditionBuilderField = {
  key: string;
  label: string;
  type: ConditionFieldType;
};

export type ConditionValueEditor = "NONE" | "SINGLE" | "LIST" | "RANGE";

export type ConditionBuilderOperator = {
  code: Operator;
  label: string;
  valueEditor: ConditionValueEditor;
};
