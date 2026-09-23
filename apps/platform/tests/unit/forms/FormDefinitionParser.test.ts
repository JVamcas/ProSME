import { describe, expect, it } from "vitest";

import {
  InvalidFormDefinitionError,
  parseFormDefinition,
} from "@/modules/forms/engine/FormDefinitionParser";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { runtimeDefinition } from "../../support/form-runtime";

describe("form definition parser", () => {
  it("converts every configurable field type to JSON Schema and UI Schema", () => {
    const parsed = parseFormDefinition(runtimeDefinition());
    const properties = parsed.schema.properties ?? {};

    expect(Object.keys(properties)).toEqual([
      "NOTES",
      "NAME",
      "AMOUNT",
      "START_DATE",
      "APPROVED",
      "REGION",
      "SECTORS",
      "BUDGET",
      "SUCCESS_RATE",
      "SUPPORTING_DOCUMENT",
    ]);
    expect(properties.AMOUNT).toMatchObject({
      maximum: 1_000,
      minimum: 100,
      type: "number",
    });
    expect(properties.NAME).toMatchObject({
      maxLength: 50,
      minLength: 2,
      type: "string",
    });
    expect(properties.START_DATE).toMatchObject({ format: "date" });
    expect(properties.APPROVED).toMatchObject({
      enum: [true, false],
    });
    expect(properties.REGION).toMatchObject({
      enum: ["FIRST", "SECOND"],
    });
    expect(properties.SECTORS).toMatchObject({
      items: { enum: ["FIRST", "SECOND"], type: "string" },
      type: "array",
      uniqueItems: true,
    });
    expect(properties.BUDGET).toMatchObject({ type: "number" });
    expect(properties.SUCCESS_RATE).toMatchObject({
      maximum: 100,
      minimum: 0,
      type: "number",
    });
    expect(properties.SUPPORTING_DOCUMENT).toMatchObject({
      format: "data-url",
      type: "string",
    });
    expect(parsed.uiSchema.NOTES).toMatchObject({ "ui:widget": "textarea" });
    expect(parsed.uiSchema.APPROVED).toMatchObject({ "ui:widget": "radio" });
    expect(parsed.uiSchema.REGION).toMatchObject({
      "ui:enumNames": ["First option", "Second option"],
      "ui:widget": "select",
    });
    expect(parsed.uiSchema.SECTORS).toMatchObject({
      "ui:enumNames": ["First option", "Second option"],
      "ui:widget": "select",
    });
    expect(parsed.uiSchema.BUDGET).toMatchObject({ "ui:widget": "currency" });
    expect(parsed.uiSchema.SUCCESS_RATE).toMatchObject({
      "ui:widget": "percentage",
    });
    expect(parsed.uiSchema.SUPPORTING_DOCUMENT).toMatchObject({
      "ui:widget": "file",
    });
    expect(parsed.schema.required).toEqual(["NAME"]);
  });

  it("rejects a field outside the saved form sections", () => {
    const definition = runtimeDefinition();
    definition.fields[0] = {
      ...definition.fields[0],
      sectionId: "30000000-0000-4000-8000-000000000001",
    };

    expect(() => parseFormDefinition(definition)).toThrow(
      InvalidFormDefinitionError,
    );
  });

  it("preserves saved order when a conditional field creates a visible gap", () => {
    const definition = runtimeDefinition();
    definition.fields[0] = {
      ...definition.fields[0],
      visibilityCondition: {
        children: [{
          id: crypto.randomUUID(),
          kind: "CONDITION",
          leftOperand: { key: "NAME", kind: "FIELD" },
          operator: basicOperators.EQUALS,
          rightOperand: { kind: "CONSTANT", value: "SHOW" },
        }],
        combinator: "AND",
        id: crypto.randomUUID(),
        kind: "GROUP",
      },
    };

    const parsed = parseFormDefinition(definition);

    expect(parsed.uiSchema["ui:order"]).toEqual([
      "NAME",
      "AMOUNT",
      "START_DATE",
      "APPROVED",
      "REGION",
      "SECTORS",
      "BUDGET",
      "SUCCESS_RATE",
      "SUPPORTING_DOCUMENT",
    ]);
    expect(parsed.schema.properties).not.toHaveProperty("NOTES");
  });
});
