import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import { createStandardForms } from "@/modules/forms/domain/StandardFormCatalogue";
import { parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { validateFormValues } from "@/modules/forms/FormValidation";
import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";

const sectionId = "10000000-0000-4000-8000-000000000001";
const repeatableField: FormField = {
  columnSpan: 2,
  key: "BUDGET_LINES",
  label: "Budget lines",
  order: 1,
  repeatable: {
    addLabel: "Add budget line",
    fields: [
      {
        columnSpan: 1,
        key: "CATEGORY",
        label: "Category",
        order: 1,
        required: true,
        type: "TEXT",
      },
      {
        columnSpan: 1,
        key: "AMOUNT",
        label: "Amount",
        minimum: 0,
        order: 2,
        required: true,
        type: "CURRENCY",
      },
    ],
    itemLabel: "Budget line",
    maximumItems: 20,
    minimumItems: 1,
  },
  required: true,
  sectionId,
  type: "REPEATABLE_GROUP",
};

function definition(): FormRuntimeSchema {
  return {
    displayMode: "SINGLE_PAGE",
    fields: [repeatableField],
    instructions: null,
    sections: [{
      columnSpan: 2,
      description: "Enter the project budget.",
      id: sectionId,
      key: "BUDGET",
      order: 1,
      showContainer: true,
      title: "Budget",
    }],
    submitLabel: "Submit",
    versionId: "20000000-0000-4000-8000-000000000001",
    versionNumber: 1,
  };
}

describe("repeatable form groups", () => {
  it("validates configuration, row limits and required item fields", () => {
    expect(formFieldSchema.safeParse(repeatableField).success).toBe(true);
    expect(validateFormValues([repeatableField], {}, false)).toBe(true);
    expect(validateFormValues([repeatableField], {}, true)).toBe(false);
    expect(validateFormValues([repeatableField], {
      BUDGET_LINES: [{ AMOUNT: 1500, CATEGORY: "Equipment" }],
    }, true)).toBe(true);
    expect(validateFormValues([repeatableField], {
      BUDGET_LINES: [{ CATEGORY: "Equipment" }],
    }, true)).toBe(false);
  });

  it("builds an object-array schema with stable item keys", () => {
    const parsed = parseFormDefinition(definition());
    expect(parsed.schema.properties?.BUDGET_LINES).toMatchObject({
      maxItems: 20,
      minItems: 1,
      type: "array",
      items: {
        required: ["CATEGORY", "AMOUNT"],
        type: "object",
      },
    });
    expect(parsed.uiSchema.BUDGET_LINES).toMatchObject({
      "ui:options": {
        addLabel: "Add budget line",
        itemLabel: "Budget line",
      },
    });
  });

  it("renders rows through the shared repeatable-group presentation", () => {
    const markup = renderToStaticMarkup(
      <FormRenderer
        definition={definition()}
        formData={{
          BUDGET_LINES: [{ AMOUNT: 1500, CATEGORY: "Equipment" }],
        }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(markup).toContain("Budget line 1");
    expect(markup).toContain("Add budget line");
    expect(markup).toContain("Category");
    expect(markup).toContain("N$");
  });

  it("seeds structured budget, team and indicator collections", () => {
    const form = createStandardForms().find(
      (candidate) => candidate.code === "FUNDING_APPLICATION",
    );
    const repeatableKeys = form?.fields
      .filter((field) => field.type === "REPEATABLE_GROUP")
      .map((field) => field.key);
    expect(repeatableKeys).toEqual([
      "BUDGET_LINES",
      "TEAM_MEMBERS",
      "PROJECT_INDICATORS",
    ]);
    expect(form?.displayMode).toBe("STEPS");
    expect(form?.fields.filter((field) => field.type === "RICH_TEXT")
      .map((field) => field.key)).toEqual([
      "PROJECT_ABSTRACT",
      "PROJECT_OBJECTIVES",
      "EXPECTED_OUTCOMES",
    ]);
    expect(form?.fields.find((field) => field.key === "TEAM_MEMBERS")
      ?.repeatable?.fields.find((field) => field.key === "EXPERIENCE")
      ?.type).toBe("RICH_TEXT");
  });

  it("adds repeatable configuration without changing submitted responses", () => {
    const migration = readFileSync(
      path.resolve(process.cwd(), "drizzle/0143_repeatable_form_groups.sql"),
      "utf8",
    );
    expect(migration).toContain("ADD COLUMN repeatable_configuration jsonb");
    expect(migration).not.toContain("app_form_responses");
    expect(migration).not.toContain("app_application_form_responses");
  });

  it("keeps the rerunnable reset limited to the approved domains", () => {
    const reset = readFileSync(
      path.resolve(process.cwd(), "../../scripts/seed/reset-platform-data.ts"),
      "utf8",
    );
    expect(reset).toContain("app_application\\\\_%");
    expect(reset).toContain("app_eligibility\\\\_%");
    expect(reset).toContain("app_form\\\\_%");
    expect(reset).toContain("app_funding_call\\\\_%");
    expect(reset).toContain("app_workflow\\\\_%");
    expect(reset).not.toContain("cms\\\\_%");
    expect(reset).not.toContain("app_notification\\\\_%");
    expect(reset).not.toContain("CASCADE");
  });
});
