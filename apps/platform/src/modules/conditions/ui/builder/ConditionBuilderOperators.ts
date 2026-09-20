import { additionalOperators } from "../../engine/AdditionalOperators";
import { basicOperators } from "../../engine/BasicOperators";
import type { ConditionBuilderOperator } from "./ConditionBuilderTypes";

export const conditionBuilderOperators = [
  { code: basicOperators.EQUALS, label: "Equals", valueEditor: "SINGLE" },
  {
    code: basicOperators.NOT_EQUALS,
    label: "Does not equal",
    valueEditor: "SINGLE",
  },
  {
    code: basicOperators.GREATER_THAN,
    label: "Greater than",
    valueEditor: "SINGLE",
  },
  {
    code: basicOperators.LESS_THAN,
    label: "Less than",
    valueEditor: "SINGLE",
  },
  {
    code: basicOperators.GREATER_THAN_OR_EQUAL,
    label: "Greater than or equal",
    valueEditor: "SINGLE",
  },
  {
    code: basicOperators.LESS_THAN_OR_EQUAL,
    label: "Less than or equal",
    valueEditor: "SINGLE",
  },
  { code: additionalOperators.IN, label: "Is in", valueEditor: "LIST" },
  {
    code: additionalOperators.NOT_IN,
    label: "Is not in",
    valueEditor: "LIST",
  },
  {
    code: additionalOperators.BETWEEN,
    label: "Is between",
    valueEditor: "RANGE",
  },
  {
    code: additionalOperators.BEFORE,
    label: "Is before",
    valueEditor: "SINGLE",
  },
  {
    code: additionalOperators.AFTER,
    label: "Is after",
    valueEditor: "SINGLE",
  },
  {
    code: additionalOperators.IS_EMPTY,
    label: "Is empty",
    valueEditor: "NONE",
  },
  {
    code: additionalOperators.IS_NOT_EMPTY,
    label: "Is not empty",
    valueEditor: "NONE",
  },
  {
    code: additionalOperators.WITHIN_LAST_N_MONTHS,
    label: "Is within the last N months",
    valueEditor: "SINGLE",
  },
] as const satisfies readonly ConditionBuilderOperator[];
