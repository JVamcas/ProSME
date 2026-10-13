import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";

const sectionId = "20000000-0000-4000-8000-000000000001";
const groupId = "20000000-0000-4000-8000-000000000002";
const nodeId = "20000000-0000-4000-8000-000000000003";

export function condition(
  key: string,
  expected: boolean | number = true,
): ConditionGroup {
  return {
    id: groupId,
    kind: "GROUP",
    combinator: "AND",
    children: [
      {
        id: nodeId,
        kind: "CONDITION",
        operator: basicOperators.EQUALS,
        leftOperand: { kind: "FIELD", key },
        rightOperand: { kind: "CONSTANT", value: expected },
      },
    ],
  };
}

const enabled: FormField = {
  key: "ENABLED",
  label: "Enabled",
  type: "YES_NO",
  required: false,
  sectionId,
  columnSpan: 1,
  order: 1,
};
export const amount: FormField = {
  key: "AMOUNT",
  label: "Amount",
  type: "NUMBER",
  required: false,
  sectionId,
  columnSpan: 1,
  order: 2,
};

export function definition(rules?: FormField["rules"]): FormRuntimeSchema {
  return {
    versionId: sectionId,
    versionNumber: 1,
    instructions: null,
    submitLabel: "Submit",
    sections: [
      {
        id: sectionId,
        key: "DETAILS",
        title: "Details",
        description: "",
        columnSpan: 1,
        order: 1,
        showContainer: true,
      },
    ],
    fields: [enabled, { ...amount, rules }],
  };
}
