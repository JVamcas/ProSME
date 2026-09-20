import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { additionalOperators } from "@/modules/conditions/engine/AdditionalOperators";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  conditionBuilderOperators,
  conditionGroupToQuery,
  queryToConditionGroup,
} from "@/modules/conditions/ui/builder";

const source: ConditionGroup = {
  id: "50000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "50000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key: "application.requested_amount" },
      operator: basicOperators.GREATER_THAN,
      rightOperand: { kind: "CONSTANT", value: 100_000 },
    },
    {
      id: "50000000-0000-4000-8000-000000000003",
      kind: "GROUP",
      combinator: "OR",
      children: [{
        id: "50000000-0000-4000-8000-000000000004",
        kind: "CONDITION",
        leftOperand: { kind: "FIELD", key: "application.sector" },
        operator: additionalOperators.IN,
        rightOperand: {
          kind: "CONSTANT",
          value: ["AGRICULTURE", "MANUFACTURING"],
        },
      }],
    },
  ],
};

describe("condition builder adapter", () => {
  it("round-trips nested groups without structural loss", () => {
    const query = conditionGroupToQuery(source);

    expect(queryToConditionGroup(
      query,
      conditionBuilderOperators,
      () => "unused",
    )).toEqual(source);
  });

  it("does not add a value operand to unary operators", () => {
    const result = queryToConditionGroup({
      combinator: "AND",
      id: "60000000-0000-4000-8000-000000000001",
      rules: [{
        field: "application.sector",
        id: "60000000-0000-4000-8000-000000000002",
        operator: additionalOperators.IS_EMPTY,
        value: "ignored",
      }],
    }, conditionBuilderOperators, () => "unused");

    expect(result.children[0]).not.toHaveProperty("rightOperand");
  });
});
