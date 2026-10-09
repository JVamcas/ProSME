import { describe, expect, it } from "vitest";
import { reportParameterEditorSchema } from "@/modules/reporting/api/ReportParameterEditorSchema";
import type { ReportParameterDefinition } from "@/modules/reporting/domain/ReportParameters";

const parameters: ReportParameterDefinition[] = [
  {
    name: "startDate",
    position: 1,
    type: "date",
    nullable: false,
    binding: "value",
  },
  {
    name: "endDate",
    position: 2,
    type: "date",
    nullable: false,
    binding: "value",
  },
];

describe("report parameter row validation", () => {
  it("rejects duplicate names and keeps SQL positions consecutive", () => {
    const schema = reportParameterEditorSchema(parameters, 1);
    expect(
      schema.safeParse({
        ...parameters[1],
        name: "startDate",
        hasDefault: false,
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...parameters[1], position: 3, hasDefault: false })
        .success,
    ).toBe(false);
    expect(
      schema.parse({
        ...parameters[1],
        name: "completedDate",
        hasDefault: false,
      }),
    ).toEqual({ ...parameters[1], name: "completedDate" });
  });

  it("validates exact decimal and nullable defaults without coercion", () => {
    const schema = reportParameterEditorSchema([]);
    const input = {
      name: "amount",
      position: 1,
      type: "decimal",
      nullable: true,
      binding: "value",
      hasDefault: true,
    };
    expect(
      schema.parse({ ...input, defaultValue: "9999999999999999.99" })
        .defaultValue,
    ).toBe("9999999999999999.99");
    expect(
      schema.parse({ ...input, defaultValue: null }).defaultValue,
    ).toBeNull();
    expect(schema.safeParse({ ...input, defaultValue: 999.99 }).success).toBe(
      false,
    );
    expect(schema.safeParse(input).success).toBe(false);
    expect(
      schema.safeParse({ ...input, nullable: false, defaultValue: null })
        .success,
    ).toBe(false);
  });

  it("clears optional defaults and discards defaults for server-owned bindings", () => {
    const schema = reportParameterEditorSchema([]);
    const input = {
      name: "runAt",
      position: 1,
      type: "timestamp",
      nullable: false,
      binding: "run-at",
      hasDefault: true,
      defaultValue: "discarded",
    };
    expect(schema.parse(input)).not.toHaveProperty("defaultValue");
    expect(schema.safeParse({ ...input, type: "text" }).success).toBe(false);
    expect(
      schema.parse({
        ...parameters[0],
        hasDefault: false,
        defaultValue: "discarded",
      }),
    ).not.toHaveProperty("defaultValue");
  });
});
