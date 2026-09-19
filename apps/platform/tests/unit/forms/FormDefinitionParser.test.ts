import { describe, expect, it } from "vitest";

import {
  InvalidFormDefinitionError,
  parseFormDefinition,
} from "@/modules/forms/engine/FormDefinitionParser";
import { runtimeDefinition } from "../../support/form-runtime";

describe("form definition parser", () => {
  it("converts every basic field type to JSON Schema and UI Schema", () => {
    const parsed = parseFormDefinition(runtimeDefinition());
    const properties = parsed.schema.properties ?? {};

    expect(Object.keys(properties)).toEqual([
      "NOTES",
      "NAME",
      "AMOUNT",
      "START_DATE",
      "APPROVED",
      "REGION",
    ]);
    expect(properties.AMOUNT).toMatchObject({ type: "number" });
    expect(properties.START_DATE).toMatchObject({ format: "date" });
    expect(properties.APPROVED).toMatchObject({
      enum: [true, false],
    });
    expect(properties.REGION).toMatchObject({
      enum: ["FIRST", "SECOND"],
    });
    expect(parsed.uiSchema.NOTES).toMatchObject({ "ui:widget": "textarea" });
    expect(parsed.uiSchema.APPROVED).toMatchObject({ "ui:widget": "radio" });
    expect(parsed.uiSchema.REGION).toMatchObject({
      "ui:enumNames": ["First option", "Second option"],
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
});
