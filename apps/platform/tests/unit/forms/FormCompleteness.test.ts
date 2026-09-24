import { describe, expect, it } from "vitest";

import { calculateFormCompleteness } from "@/modules/forms/engine/FormCompleteness";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { runtimeDefinition } from "../../support/form-runtime";

function definitionWithTwoSections(): FormRuntimeSchema {
  const definition = runtimeDefinition();
  const secondSectionId = "10000000-0000-4000-8000-000000000002";
  return {
    ...definition,
    fields: [
      definition.fields[1],
      {
        ...definition.fields[2],
        key: "EMPLOYEE_COUNT",
        label: "Employee count",
        maximum: 100,
        minimum: 1,
        order: 1,
        required: true,
        sectionId: secondSectionId,
      },
      {
        ...definition.fields[0],
        key: "OPTIONAL_NOTES",
        order: 2,
        required: false,
        sectionId: secondSectionId,
      },
    ],
    sections: [
      definition.sections[0],
      {
        columnSpan: 2,
        description: "Staff details.",
        id: secondSectionId,
        key: "STAFF",
        order: 2,
        showContainer: true,
        title: "Staff",
      },
    ],
  };
}

describe("form completeness", () => {
  it("calculates section and overall required-field completeness", () => {
    const completeness = calculateFormCompleteness(
      definitionWithTwoSections(),
      { NAME: "Acme" },
    );

    expect(completeness).toMatchObject({
      completedRequiredFieldCount: 1,
      isComplete: false,
      percentComplete: 50,
      requiredFieldCount: 2,
    });
    expect(completeness.sections).toMatchObject([
      {
        completedRequiredFieldCount: 1,
        isComplete: true,
        requiredFieldCount: 1,
        sectionKey: "BASIC_INFORMATION",
      },
      {
        completedRequiredFieldCount: 0,
        isComplete: false,
        requiredFieldCount: 1,
        sectionKey: "STAFF",
      },
    ]);
  });

  it("does not count invalid required values as complete", () => {
    const completeness = calculateFormCompleteness(
      definitionWithTwoSections(),
      { EMPLOYEE_COUNT: 0, NAME: "A" },
    );

    expect(completeness.completedRequiredFieldCount).toBe(0);
    expect(completeness.percentComplete).toBe(0);
  });

  it("counts zero and false when allowed by their field definitions", () => {
    const definition = runtimeDefinition();
    definition.fields = [
      {
        ...definition.fields[2],
        key: "ZERO_ALLOWED",
        maximum: undefined,
        minimum: 0,
        order: 1,
        required: true,
      },
      {
        ...definition.fields[4],
        key: "DECLINED",
        order: 2,
        required: true,
      },
    ];

    const completeness = calculateFormCompleteness(
      definition,
      { DECLINED: false, ZERO_ALLOWED: 0 },
    );

    expect(completeness.isComplete).toBe(true);
    expect(completeness.completedRequiredFieldCount).toBe(2);
  });

  it("treats sections and forms without required fields as complete", () => {
    const definition = runtimeDefinition();
    definition.fields = definition.fields.map((field) => ({
      ...field,
      required: false,
    }));

    expect(calculateFormCompleteness(definition, {})).toMatchObject({
      completedRequiredFieldCount: 0,
      isComplete: true,
      percentComplete: 100,
      requiredFieldCount: 0,
      sections: [{ isComplete: true, requiredFieldCount: 0 }],
    });
  });
});
