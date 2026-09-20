import { describe, expect, it } from "vitest";

import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  activeFormDefinition,
  formVisibilityConfigurationErrors,
  resolveFormVisibility,
  sanitizeFormResponseValues,
} from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

const controlSectionId = "10000000-0000-4000-8000-000000000001";
const detailsSectionId = "10000000-0000-4000-8000-000000000002";

function equals(key: string, value: string | boolean): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    kind: "GROUP",
    combinator: "AND",
    children: [{
      id: crypto.randomUUID(),
      kind: "CONDITION",
      leftOperand: { kind: "FIELD", key },
      operator: basicOperators.EQUALS,
      rightOperand: { kind: "CONSTANT", value },
    }],
  };
}

function definition(): FormRuntimeSchema {
  return {
    fields: [
      {
        columnSpan: 1,
        key: "HAS_DETAILS",
        label: "Has details",
        order: 1,
        required: true,
        sectionId: controlSectionId,
        type: "YES_NO",
      },
      {
        columnSpan: 1,
        key: "CATEGORY",
        label: "Category",
        order: 2,
        required: true,
        sectionId: controlSectionId,
        type: "SINGLE_SELECT",
        options: [
          { key: "STANDARD", label: "Standard", order: 1 },
          { key: "OTHER", label: "Other", order: 2 },
        ],
      },
      {
        columnSpan: 1,
        key: "DETAILS",
        label: "Details",
        order: 1,
        required: true,
        sectionId: detailsSectionId,
        type: "TEXTAREA",
      },
      {
        columnSpan: 1,
        key: "OTHER_CATEGORY",
        label: "Other category",
        order: 3,
        required: true,
        sectionId: controlSectionId,
        type: "TEXT",
        visibilityCondition: equals("CATEGORY", "OTHER"),
      },
    ],
    instructions: null,
    sections: [
      {
        columnSpan: 2,
        description: "",
        id: controlSectionId,
        key: "CONTROL",
        order: 1,
        showContainer: true,
        title: "Control",
      },
      {
        columnSpan: 2,
        description: "",
        id: detailsSectionId,
        key: "DETAILS_SECTION",
        order: 2,
        showContainer: true,
        title: "Details",
        visibilityCondition: equals("HAS_DETAILS", true),
      },
    ],
    submitLabel: "Submit",
    versionId: "20000000-0000-4000-8000-000000000001",
    versionNumber: 1,
  };
}

describe("conditional form visibility", () => {
  it("hides a section and its required fields when its condition fails", () => {
    const schema = definition();
    const values = {
      CATEGORY: "STANDARD",
      DETAILS: "Previously entered",
      HAS_DETAILS: false,
      OTHER_CATEGORY: "Previously entered",
    };

    const visible = resolveFormVisibility(schema, values);
    const active = activeFormDefinition(schema, values);

    expect(visible.sections.map((section) => section.key)).toEqual(["CONTROL"]);
    expect(visible.fields.map((field) => field.key)).toEqual([
      "HAS_DETAILS",
      "CATEGORY",
    ]);
    expect(validateFormValues(
      active.fields,
      sanitizeFormResponseValues(schema, values),
      true,
    )).toBe(true);
    expect(values.DETAILS).toBe("Previously entered");
  });

  it("excludes hidden section and field values from the response", () => {
    const values = {
      CATEGORY: "STANDARD",
      DETAILS: "Do not persist",
      HAS_DETAILS: false,
      OTHER_CATEGORY: "Do not persist",
    };

    expect(sanitizeFormResponseValues(definition(), values)).toEqual({
      CATEGORY: "STANDARD",
      HAS_DETAILS: false,
    });
  });

  it("restores configured requirements when conditions pass", () => {
    const schema = definition();
    const values = { CATEGORY: "OTHER", HAS_DETAILS: true };
    const active = activeFormDefinition(schema, values);

    expect(active.fields.map((field) => field.key)).toEqual([
      "HAS_DETAILS",
      "CATEGORY",
      "DETAILS",
      "OTHER_CATEGORY",
    ]);
    expect(validateFormValues(active.fields, values, true)).toBe(false);
  });

  it("rejects visibility conditions that reference unavailable fields", () => {
    const schema = definition();
    schema.sections[1].visibilityCondition = equals("MISSING", true);

    expect(formVisibilityConfigurationErrors(
      schema.fields,
      schema.sections,
    )).toEqual(expect.arrayContaining([
      expect.stringContaining('Field "MISSING" is not available.'),
    ]));
  });

  it("rejects forward references that could create visibility cycles", () => {
    const schema = definition();
    schema.fields[0].visibilityCondition = equals("CATEGORY", "OTHER");

    expect(formVisibilityConfigurationErrors(
      schema.fields,
      schema.sections,
    )).toEqual(expect.arrayContaining([
      expect.stringContaining('Field "CATEGORY" is not available.'),
    ]));
  });
});
