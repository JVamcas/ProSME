import { additionalOperators } from "../../engine/AdditionalOperators";
import { basicOperators } from "../../engine/BasicOperators";
import type {
  ConditionFieldType,
  ConditionOperatorDefinition,
} from "../../domain/ConditionConfiguration";

const allFieldTypes = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
] as const satisfies readonly ConditionFieldType[];

const orderedFieldTypes = [
  "TEXT",
  "NUMBER",
  "DATE",
] as const satisfies readonly ConditionFieldType[];

export const conditionBuilderOperators = [
  {
    allowedFieldTypes: allFieldTypes,
    code: basicOperators.EQUALS,
    label: "Equals",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: allFieldTypes,
    code: basicOperators.NOT_EQUALS,
    label: "Does not equal",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: orderedFieldTypes,
    code: basicOperators.GREATER_THAN,
    label: "Greater than",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: orderedFieldTypes,
    code: basicOperators.LESS_THAN,
    label: "Less than",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: orderedFieldTypes,
    code: basicOperators.GREATER_THAN_OR_EQUAL,
    label: "Greater than or equal",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: orderedFieldTypes,
    code: basicOperators.LESS_THAN_OR_EQUAL,
    label: "Less than or equal",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: allFieldTypes,
    code: additionalOperators.IN,
    label: "Is in",
    valueShape: "LIST",
  },
  {
    allowedFieldTypes: allFieldTypes,
    code: additionalOperators.NOT_IN,
    label: "Is not in",
    valueShape: "LIST",
  },
  {
    allowedFieldTypes: ["NUMBER", "DATE"],
    code: additionalOperators.BETWEEN,
    label: "Is between",
    valueShape: "RANGE",
  },
  {
    allowedFieldTypes: ["DATE"],
    code: additionalOperators.BEFORE,
    label: "Is before",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: ["DATE"],
    code: additionalOperators.AFTER,
    label: "Is after",
    valueShape: "SINGLE",
  },
  {
    allowedFieldTypes: allFieldTypes,
    code: additionalOperators.IS_EMPTY,
    label: "Is empty",
    valueShape: "NONE",
  },
  {
    allowedFieldTypes: allFieldTypes,
    code: additionalOperators.IS_NOT_EMPTY,
    label: "Is not empty",
    valueShape: "NONE",
  },
  {
    allowedFieldTypes: ["DATE"],
    code: additionalOperators.WITHIN_LAST_N_MONTHS,
    label: "Is within the last N months",
    valueShape: "SINGLE",
  },
] as const satisfies readonly ConditionOperatorDefinition[];
