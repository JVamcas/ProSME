import { describe, expect, it } from "vitest";

import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { additionalOperators } from "@/modules/conditions/engine/AdditionalOperators";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { formatConditionGroupPreview } from "@/modules/conditions/engine/ConditionPreview";
import { conditionBuilderOperators } from "@/modules/conditions/ui/builder";

const fields = [
  {
    key: "application.requested_amount",
    label: "Requested amount",
    type: "NUMBER",
  },
  { key: "application.sector", label: "Sector", type: "TEXT" },
  {
    key: "application.submitted_on",
    label: "Submitted on",
    type: "DATE",
  },
] as const satisfies readonly ConditionFieldDefinition[];

describe("condition preview", () => {
  it("describes nested conditions using configured labels", () => {
    const group: ConditionGroup = {
      id: "a0000000-0000-4000-8000-000000000001",
      kind: "GROUP",
      combinator: "AND",
      children: [
        {
          id: "a0000000-0000-4000-8000-000000000002",
          kind: "CONDITION",
          leftOperand: {
            kind: "FIELD",
            key: "application.requested_amount",
          },
          operator: basicOperators.GREATER_THAN,
          rightOperand: { kind: "CONSTANT", value: 100_000 },
        },
        {
          id: "a0000000-0000-4000-8000-000000000003",
          kind: "GROUP",
          combinator: "OR",
          children: [
            {
              id: "a0000000-0000-4000-8000-000000000004",
              kind: "CONDITION",
              leftOperand: { kind: "FIELD", key: "application.sector" },
              operator: additionalOperators.IN,
              rightOperand: {
                kind: "CONSTANT",
                value: ["Agriculture", "Manufacturing"],
              },
            },
            {
              id: "a0000000-0000-4000-8000-000000000005",
              kind: "CONDITION",
              leftOperand: {
                kind: "FIELD",
                key: "application.submitted_on",
              },
              operator: additionalOperators.BEFORE,
              rightOperand: { kind: "CONSTANT", value: "2026-12-31" },
            },
          ],
        },
      ],
    };

    expect(formatConditionGroupPreview(
      group,
      fields,
      conditionBuilderOperators,
    )).toBe(
      "Requested amount Greater than 100000 AND "
      + "(Sector Is in (“Agriculture”, “Manufacturing”) OR "
      + "Submitted on Is before “2026-12-31”)",
    );
  });

  it("makes incomplete and unknown references visible", () => {
    expect(formatConditionGroupPreview({
      id: "b0000000-0000-4000-8000-000000000001",
      kind: "GROUP",
      combinator: "AND",
      children: [],
    }, fields, conditionBuilderOperators)).toBe("[Empty group]");
  });
});
