import { describe, expect, it } from "vitest";
import {
  configuredReportFormSchema,
  configuredReportEditorSchema,
  reportTemplateFormSchema,
} from "@/modules/reporting/api/ReportFormSchemas";
import {
  configuredReportInputSchema,
  configuredReportSaveSchema,
  reportTemplateInputSchema,
} from "@/modules/reporting/api/ReportManagementSchemas";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { applicationPipelineTemplate } from "@/modules/reporting/application/bootstrap/ApplicationPipelineTemplate";
import { reportParameterValuesSchema } from "@/modules/reporting/domain/ReportParameterValues";

const definition = applicationExportTemplate.definition;
const editorInput = {
  name: "Export",
  description:
    "Submitted application export for the selected reporting period.",
  templateId: crypto.randomUUID(),
  templateVersion: 1,
  format: "CSV",
  defaults: { period: "previous-month", values: {} },
};
const input = { ...editorInput, key: "application-export" };
describe("schema-driven reporting forms", () => {
  it.each([
    ["template", reportTemplateInputSchema, applicationExportTemplate],
    ["report", configuredReportInputSchema, input],
  ] as const)(
    "requires a bounded, nonblank %s description",
    (_label, schema, values) => {
      const missing = { ...values, description: undefined };
      expect(schema.safeParse(missing).success).toBe(false);
      for (const description of ["", " \n\t ", "x".repeat(2001)]) {
        expect(schema.safeParse({ ...values, description }).success).toBe(
          false,
        );
      }
      expect(
        schema.parse({ ...values, description: "  Reporting purpose.  " })
          .description,
      ).toBe("Reporting purpose.");
    },
  );
  it("generates valid report keys without accepting a manually supplied key", () => {
    for (const [name, key] of [
      ["Application Data Export", "application-data-export"],
      ["2026 review", "report-2026-review"],
      ["审核", "report"],
    ]) {
      const parsed = configuredReportEditorSchema(definition).parse({
        ...editorInput,
        name,
      });
      expect(parsed.key).toBe(key);
      expect(parsed).not.toHaveProperty("templateVersion");
      expect(configuredReportSaveSchema.safeParse(parsed).success).toBe(true);
    }
    expect(
      configuredReportEditorSchema(definition).safeParse({
        ...editorInput,
        key: "manual",
      }).success,
    ).toBe(false);
    expect(
      configuredReportEditorSchema(definition).safeParse({
        ...editorInput,
        name: " ",
      }).success,
    ).toBe(false);
  });
  it("preserves the stored report key and row version when renaming", () => {
    const parsed = configuredReportEditorSchema(
      definition,
      "application-export",
    ).parse({
      ...editorInput,
      name: "Renamed export",
      rowVersion: 4,
    });
    expect(parsed.key).toBe("application-export");
    expect(parsed.rowVersion).toBe(4);
  });
  it("generates valid template keys using the existing label generator", () => {
    for (const [name, key] of [
      ["Application Data Export", "application-data-export"],
      ["2026 review", "template-2026-review"],
      ["审核", "template"],
    ]) {
      const parsed = reportTemplateFormSchema().parse({
        name,
        description: "Application export template.",
        definition,
      });
      expect(parsed.key).toBe(key);
      expect(reportTemplateInputSchema.safeParse(parsed).success).toBe(true);
    }
  });
  it("preserves a saved template key when its name changes", () => {
    const parsed = reportTemplateFormSchema("website-analytics").parse({
      name: "Renamed website report",
      description: "Website metrics for the selected reporting period.",
      definition,
      rowVersion: 3,
    });
    expect(parsed.key).toBe("website-analytics");
    expect(parsed.rowVersion).toBe(3);
  });
  it("rejects blank names and manually supplied keys in the template form", () => {
    expect(
      reportTemplateFormSchema().safeParse({ name: " ", definition }).success,
    ).toBe(false);
    expect(
      reportTemplateFormSchema().safeParse({
        name: "Export",
        key: "manual",
        definition,
      }).success,
    ).toBe(false);
  });
  it("accepts relative date defaults and validates typed nullable/defaulted parameters", () => {
    expect(
      configuredReportFormSchema(definition).safeParse(input).success,
    ).toBe(true);
    const values = reportParameterValuesSchema(definition.parameters);
    expect(
      values.safeParse({
        startDate: "2026-10-01",
        endDate: "2026-10-08",
        fundingCallId: null,
        lifecycleStatuses: ["submitted"],
      }).success,
    ).toBe(true);
    expect(
      values.safeParse({ startDate: "invalid", endDate: "2026-10-08" }).success,
    ).toBe(false);
    expect(
      values.safeParse({
        startDate: "2026-10-01",
        endDate: "2026-10-08",
        lifecycleStatuses: "submitted",
      }).success,
    ).toBe(false);
  });
  it("rejects missing published templates, unsupported formats and period/dataset mismatches", () => {
    expect(configuredReportFormSchema().safeParse(input).success).toBe(false);
    expect(
      configuredReportFormSchema({
        ...definition,
        formats: ["XLSX"],
      }).safeParse(input).success,
    ).toBe(false);
    expect(
      configuredReportFormSchema(definition).safeParse({
        ...input,
        defaults: { period: "website-completed", values: {} },
      }).success,
    ).toBe(false);
    expect(
      configuredReportFormSchema(
        applicationPipelineTemplate.definition,
      ).safeParse(input).success,
    ).toBe(false);
  });
  it("rejects explicit date defaults that would override a relative period", () => {
    expect(
      configuredReportFormSchema(definition).safeParse({
        ...input,
        defaults: {
          period: "previous-month",
          values: { startDate: "2026-10-01", endDate: "2026-10-08" },
        },
      }).success,
    ).toBe(false);
  });
  it("requires explicit dates when no relative policy supplies them and rejects injected source bindings", () => {
    expect(
      configuredReportFormSchema(definition).safeParse({
        ...input,
        defaults: { period: "explicit", values: {} },
      }).success,
    ).toBe(false);
    expect(
      reportParameterValuesSchema(definition.parameters).safeParse({
        startDate: "2026-10-01",
        endDate: "2026-10-08",
        timezone: "UTC",
        actorId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
