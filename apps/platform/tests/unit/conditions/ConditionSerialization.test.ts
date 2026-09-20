import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import {
  deserializeConditionGroup,
  serializeConditionGroup,
} from "@/modules/conditions/domain/ConditionSerialization";
import { operator } from "@/modules/conditions/domain/Operator";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";

const group: ConditionGroup = {
  id: "00000000-0000-4000-8000-000000000001",
  kind: "GROUP",
  combinator: "AND",
  children: [
    {
      id: "00000000-0000-4000-8000-000000000002",
      kind: "CONDITION",
      leftOperand: {
        kind: "FIELD",
        key: "application.requested_amount",
      },
      operator: basicOperators.EQUALS,
      rightOperand: {
        kind: "CONSTANT",
        value: {
          amount: 250_000,
          metadata: [true, null, "NAD"],
        },
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      kind: "GROUP",
      combinator: "OR",
      children: [
        {
          id: "00000000-0000-4000-8000-000000000004",
          kind: "CONDITION",
          leftOperand: { kind: "FIELD", key: "business.region" },
          operator: basicOperators.NOT_EQUALS,
          rightOperand: { kind: "CONSTANT", value: "Khomas" },
        },
      ],
    },
  ],
};

describe("condition serialization", () => {
  it("round-trips nested groups and operands without structural loss", () => {
    const serialized = serializeConditionGroup(group);
    const storedJson = JSON.parse(JSON.stringify(serialized));

    expect(deserializeConditionGroup(storedJson)).toEqual(group);
  });

  it("rejects unrecognized structures instead of translating them", () => {
    expect(() =>
      deserializeConditionGroup({
        ...group,
        legacyRules: group.children,
      }),
    ).toThrow();
  });

  it("rejects invalid operator codes and non-JSON constants", () => {
    expect(() => operator("equals")).toThrow();
    expect(() =>
      deserializeConditionGroup({
        ...group,
        children: [
          {
            ...group.children[0],
            rightOperand: { kind: "CONSTANT", value: Number.NaN },
          },
        ],
      }),
    ).toThrow();
  });
});
