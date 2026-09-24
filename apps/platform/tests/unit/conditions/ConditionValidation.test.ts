import { describe, expect, it } from "vitest";

import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { operator } from "@/modules/conditions/domain/Operator";
import { additionalOperators } from "@/modules/conditions/engine/AdditionalOperators";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import { conditionBuilderOperators } from "@/modules/conditions/ui/builder";

const fields = [
  {
    key: "application.requested_amount",
    label: "Requested amount",
    type: "NUMBER",
  },
  {
    key: "application.sector",
    label: "Sector",
    type: "TEXT",
  },
  {
    key: "application.submitted_on",
    label: "Submitted on",
    type: "DATE",
  },
] as const satisfies readonly ConditionFieldDefinition[];

function conditionGroup(children: ConditionGroup["children"]): ConditionGroup {
  return {
    id: "70000000-0000-4000-8000-000000000001",
    kind: "GROUP",
    combinator: "AND",
    children,
  };
}

describe("condition validation", () => {
  it("accepts valid fields, operators, values, and nested groups", () => {
    const result = validateConditionGroup(conditionGroup([
      {
        id: "70000000-0000-4000-8000-000000000002",
        kind: "CONDITION",
        leftOperand: {
          kind: "FIELD",
          key: "application.requested_amount",
        },
        operator: additionalOperators.BETWEEN,
        rightOperand: { kind: "CONSTANT", value: [100_000, 250_000] },
      },
      {
        id: "70000000-0000-4000-8000-000000000003",
        kind: "GROUP",
        combinator: "OR",
        children: [{
          id: "70000000-0000-4000-8000-000000000004",
          kind: "CONDITION",
          leftOperand: {
            kind: "FIELD",
            key: "application.submitted_on",
          },
          operator: additionalOperators.WITHIN_LAST_N_MONTHS,
          rightOperand: { kind: "CONSTANT", value: 6 },
        }],
      },
    ]), fields, conditionBuilderOperators);

    expect(result).toEqual({ issues: [], valid: true });
  });

  it("reports field, operator, value, and group structure issues", () => {
    const duplicateId = "80000000-0000-4000-8000-000000000002";
    const result = validateConditionGroup(conditionGroup([
      {
        id: duplicateId,
        kind: "CONDITION",
        leftOperand: { kind: "FIELD", key: "application.unknown" },
        operator: operator("UNKNOWN_OPERATOR"),
      },
      {
        id: duplicateId,
        kind: "CONDITION",
        leftOperand: { kind: "FIELD", key: "application.sector" },
        operator: additionalOperators.BEFORE,
        rightOperand: { kind: "CONSTANT", value: "" },
      },
      {
        id: "80000000-0000-4000-8000-000000000003",
        kind: "CONDITION",
        leftOperand: {
          kind: "FIELD",
          key: "application.requested_amount",
        },
        operator: basicOperators.EQUALS,
        rightOperand: { kind: "CONSTANT", value: "not a number" },
      },
      {
        id: "80000000-0000-4000-8000-000000000004",
        kind: "GROUP",
        combinator: "OR",
        children: [],
      },
    ]), fields, conditionBuilderOperators);

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "DUPLICATE_NODE_ID",
      "EMPTY_GROUP",
      "FIELD_NOT_FOUND",
      "OPERATOR_NOT_COMPATIBLE",
      "OPERATOR_NOT_FOUND",
      "VALUE_TYPE",
    ]));
  });

  it("validates lists, ranges, month counts, and computed operands", () => {
    const result = validateConditionGroup(conditionGroup([
      {
        id: "90000000-0000-4000-8000-000000000001",
        kind: "CONDITION",
        leftOperand: { kind: "FIELD", key: "application.sector" },
        operator: additionalOperators.IN,
        rightOperand: { kind: "CONSTANT", value: [] },
      },
      {
        id: "90000000-0000-4000-8000-000000000002",
        kind: "CONDITION",
        leftOperand: {
          kind: "FIELD",
          key: "application.requested_amount",
        },
        operator: additionalOperators.BETWEEN,
        rightOperand: { kind: "CONSTANT", value: [200, 100] },
      },
      {
        id: "90000000-0000-4000-8000-000000000003",
        kind: "CONDITION",
        leftOperand: {
          kind: "FIELD",
          key: "application.submitted_on",
        },
        operator: additionalOperators.WITHIN_LAST_N_MONTHS,
        rightOperand: { kind: "CONSTANT", value: 0 },
      },
      {
        id: "90000000-0000-4000-8000-000000000004",
        kind: "CONDITION",
        leftOperand: {
          kind: "COMPUTED",
          operation: "DIVIDE",
          leftOperand: { kind: "FIELD", key: "application.sector" },
          rightOperand: { kind: "CONSTANT", value: 2 },
        },
        operator: basicOperators.GREATER_THAN,
        rightOperand: { kind: "CONSTANT", value: 1 },
      },
    ]), fields, conditionBuilderOperators);

    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "COMPUTED_OPERAND_TYPE",
      "VALUE_LIST_EMPTY",
      "VALUE_RANGE_ORDER",
      "VALUE_TYPE",
    ]));
    expect(result.issues.some(
      (issue) => issue.message === "Month count must be a positive integer.",
    )).toBe(true);
  });
});
