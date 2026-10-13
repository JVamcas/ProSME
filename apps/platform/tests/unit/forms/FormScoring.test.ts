import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  calculateFormScores,
  formScoringErrors,
} from "@/modules/forms/engine/FormScoring";
import { validatedFormResponseValues } from "@/modules/forms/application/FormResponseValidation";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { validateFormValues } from "@/modules/forms/FormValidation";

const sectionId = "20000000-0000-4000-8000-000000000001";
const base = { sectionId, columnSpan: 1 as const, order: 1, required: true };
const scores: FormField[] = [
  {
    ...base,
    key: "INNOVATION",
    label: "Innovation",
    type: "SCORE",
    minimum: 0,
    maximum: 5,
  },
  {
    ...base,
    key: "FEASIBILITY",
    label: "Feasibility",
    type: "SCORE",
    minimum: 0,
    maximum: 10,
    order: 2,
  },
  {
    ...base,
    key: "IMPACT",
    label: "Impact",
    type: "SCORE",
    minimum: 0,
    maximum: 5,
    order: 3,
  },
];
const aggregate: FormField = {
  ...base,
  key: "TOTAL",
  label: "Total",
  type: "SCORING_AGGREGATE",
  order: 4,
  scoringAggregate: {
    sources: [
      { fieldKey: "INNOVATION", weight: 30 },
      { fieldKey: "FEASIBILITY", weight: 40 },
      { fieldKey: "IMPACT", weight: 30 },
    ],
    method: "WEIGHTED_AVERAGE",
    normalization: "PERCENTAGE",
    missing: "REQUIRE_ALL",
    precision: 2,
  },
};
const fields = [...scores, aggregate];
const values = { INNOVATION: 4, FEASIBILITY: 8, IMPACT: 3 };
const schema: FormRuntimeSchema = {
  versionId: sectionId,
  versionNumber: 1,
  instructions: null,
  submitLabel: "Complete",
  sections: [
    {
      id: sectionId,
      key: "ASSESSMENT",
      title: "Assessment",
      description: "",
      columnSpan: 1,
      showContainer: true,
      order: 1,
    },
  ],
  fields,
};

describe("score fields and aggregates", () => {
  it("normalizes different ranges and applies weights", () => {
    expect(calculateFormScores(fields, values).TOTAL).toBe(74);
  });
  it.each([
    ["SUM", 15],
    ["AVERAGE", 5],
    ["WEIGHTED_SUM", 530],
    ["WEIGHTED_AVERAGE", 5.3],
  ] as const)("supports %s without changing raw scales", (method, expected) => {
    const field = {
      ...aggregate,
      scoringAggregate: {
        ...aggregate.scoringAggregate!,
        method,
        normalization: "RAW" as const,
      },
    };
    expect(calculateFormScores([...scores, field], values).TOTAL).toBe(
      expected,
    );
  });
  it("keeps missing or invalid source scores unresolved, including forged totals", () => {
    expect(
      calculateFormScores(fields, { INNOVATION: 4, TOTAL: 100 }),
    ).not.toHaveProperty("TOTAL");
    expect(
      calculateFormScores(fields, { ...values, IMPACT: 20, TOTAL: 100 }),
    ).not.toHaveProperty("TOTAL");
    expect(
      calculateFormScores(fields, { ...values, INNOVATION: 0 }).TOTAL,
    ).toBe(50);
  });
  it("uses only available weights when explicitly configured", () => {
    const field = {
      ...aggregate,
      scoringAggregate: {
        ...aggregate.scoringAggregate!,
        missing: "USE_AVAILABLE" as const,
      },
    };
    expect(
      calculateFormScores([...scores, field], { INNOVATION: 4 }).TOTAL,
    ).toBe(80);
  });
  it("rejects missing sources, duplicate sources, aggregates as sources, and invalid ranges", () => {
    expect(formScoringErrors(fields)).toEqual([]);
    expect(formScoringErrors([{ ...scores[0], maximum: 0 }])).not.toEqual([]);
    expect(formScoringErrors([aggregate])).not.toEqual([]);
    expect(
      formScoringErrors([
        ...scores,
        {
          ...aggregate,
          scoringAggregate: {
            ...aggregate.scoringAggregate!,
            sources: [{ fieldKey: "TOTAL", weight: 1 }],
          },
        },
      ]),
    ).not.toEqual([]);
    expect(
      formFieldSchema.safeParse({
        ...aggregate,
        scoringAggregate: {
          ...aggregate.scoringAggregate!,
          sources: [
            { fieldKey: "IMPACT", weight: 1 },
            { fieldKey: "IMPACT", weight: 2 },
          ],
        },
      }).success,
    ).toBe(false);
  });
  it("recomputes submitted totals on the server and validates required source scores", () => {
    expect(
      validatedFormResponseValues(schema, { ...values, TOTAL: 999 }, true)
        .TOTAL,
    ).toBe(74);
    expect(() =>
      validatedFormResponseValues(schema, { INNOVATION: 4, TOTAL: 999 }, true),
    ).toThrow();
    expect(
      validateFormValues(scores, { ...values, INNOVATION: -1 }, true),
    ).toBe(false);
  });
  it("preserves source references when section names and positions change", () => {
    expect(calculateFormScores([...fields].reverse(), values).TOTAL).toBe(74);
  });
});
