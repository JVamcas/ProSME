import { getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pg-proxy";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readFormFields } from "@/modules/forms/infrastructure/FormRepository";
import {
  copyFormVersionChildren,
  readPublicationFields,
  replaceDraftContent,
} from "@/modules/forms/infrastructure/FormFieldWriteRepository";
import {
  formFields,
  formSections,
} from "@/modules/forms/infrastructure/form.schema";
import { condition, definition } from "../../support/FormFieldRuleFixture";

const form = definition({
  editableCondition: condition("ENABLED"),
  requiredCondition: condition("ENABLED"),
  validationCondition: condition("AMOUNT", 10),
  validationSettings: {
    message: "Use ten.",
    modes: ["SUBMIT"],
    missing: "REJECT",
  },
});

function projectedRow(query: string, values: Record<string, unknown>) {
  return query
    .slice("select ".length, query.indexOf(" from "))
    .split(", ")
    .map((column) => values[column.match(/"([^"]+)"$/)![1]] ?? null);
}

describe("form rule persistence", () => {
  it.each(["runtime", "publication"])(
    "preserves rules in the %s projection",
    async (mode) => {
      const field = form.fields[1];
      const values = Object.fromEntries(
        Object.entries(getTableColumns(formFields)).map(([key, column]) => [
          column.name,
          field[key as keyof typeof field],
        ]),
      );
      const execute = vi.fn(async (query: string) => ({
        rows: query.includes('from "app_form_fields"')
          ? [projectedRow(query, values)]
          : [],
      }));
      const database = drizzle(execute);
      vi.mocked(getDatabase).mockReturnValue(database as never);
      const fields =
        mode === "runtime"
          ? await readFormFields(form.versionId)
          : await readPublicationFields(database as never, form.versionId);
      expect(fields[0].rules).toEqual(field.rules);
      expect(execute.mock.calls[0][0]).toContain('"rules"');
    },
  );

  it("writes rules with draft content", async () => {
    const execute = vi.fn(async () => ({ rows: [] }));
    await replaceDraftContent(
      drizzle(execute) as never,
      form.versionId,
      form.fields,
      form.sections,
    );
    const call = execute.mock.calls.find((args) =>
      (args as unknown as [string])[0].startsWith(
        'insert into "app_form_fields"',
      ),
    ) as unknown as [string, unknown[]];
    expect(call[0]).toContain('"rules"');
    expect(call[1]).toContain(JSON.stringify(form.fields[1].rules));
  });

  it("copies rules into an independent form version", async () => {
    const section = form.sections[0];
    const sectionValues = Object.fromEntries(
      Object.entries(getTableColumns(formSections)).map(([key, column]) => [
        column.name,
        section[key as keyof typeof section],
      ]),
    );
    const field = {
      ...form.fields[1],
      id: "20000000-0000-4000-8000-000000000007",
    };
    const fieldValues = Object.fromEntries(
      Object.entries(getTableColumns(formFields)).map(([key, column]) => [
        column.name,
        field[key as keyof typeof field],
      ]),
    );
    const execute = vi.fn(async (query: string) => ({
      rows:
        query.startsWith("select") && query.includes('from "app_form_sections"')
          ? [projectedRow(query, sectionValues)]
          : query.startsWith("select") &&
              query.includes('from "app_form_fields"')
            ? [projectedRow(query, fieldValues)]
            : [],
    }));
    await copyFormVersionChildren(
      drizzle(execute) as never,
      form.versionId,
      "new-version",
    );
    const call = execute.mock.calls.find((args) =>
      args[0].startsWith('insert into "app_form_fields"'),
    );
    expect((call as unknown as [string, unknown[]])[1]).toContain(
      JSON.stringify(field.rules),
    );
  });
});
