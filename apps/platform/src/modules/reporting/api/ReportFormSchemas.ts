import type { z } from "zod";
import type { ReportTemplateDefinition } from "../domain/ReportDefinition";
import { reportParameterValuesSchema } from "../domain/ReportParameterValues";
import {
  configuredReportInputSchema,
  reportTemplateInputSchema,
} from "./ReportManagementSchemas";
import { stableKeyFromLabel } from "@/modules/workflows/domain/WorkflowStableKey";

function reportKeyFromName(name: string, fallback: string) {
  return stableKeyFromLabel(name, fallback).toLowerCase().replaceAll("_", "-");
}

export function reportTemplateFormSchema(existingKey?: string) {
  return reportTemplateInputSchema.omit({ key: true }).transform((input) => ({
    ...input,
    key: existingKey ?? reportKeyFromName(input.name, "TEMPLATE"),
  }));
}

export function configuredReportFormSchema(
  definition?: ReportTemplateDefinition,
) {
  return configuredReportInputSchema.superRefine((input, context) => {
    if (!definition) {
      context.addIssue({
        code: "custom",
        path: ["templateId"],
        message: "Select an available published template version.",
      });
      return;
    }
    if (!definition.formats.includes(input.format)) {
      context.addIssue({
        code: "custom",
        path: ["format"],
        message: "The template does not support this format.",
      });
    }
    const relative = input.defaults.period !== "explicit";
    const dates = definition.parameters.filter((parameter) =>
      ["startDate", "endDate"].includes(parameter.name),
    );
    if (relative && dates.length !== 2) {
      context.addIssue({
        code: "custom",
        path: ["defaults", "period"],
        message: "Relative periods require startDate and endDate parameters.",
      });
    }
    if (
      input.defaults.period === "website-completed" &&
      definition.datasetKey !== "website-analytics"
    ) {
      context.addIssue({
        code: "custom",
        path: ["defaults", "period"],
        message: "Website collection dates apply only to website analytics.",
      });
    }
    const values = { ...input.defaults.values };
    if (relative) {
      // Validate the value contract without resolving a real generation period in the browser.
      for (const date of dates) {
        if (values[date.name] !== undefined) {
          context.addIssue({
            code: "custom",
            path: ["defaults", "period"],
            message:
              "Relative periods resolve their dates when the report runs. Remove explicit date defaults.",
          });
        }
        values[date.name] = "2000-01-01";
      }
    }
    const parsed = reportParameterValuesSchema(definition.parameters).safeParse(
      values,
    );
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({
          code: "custom",
          path: ["defaults", "values", ...issue.path],
          message: issue.message,
        });
      }
    }
  });
}

export function configuredReportEditorSchema(
  definition?: ReportTemplateDefinition,
  existingKey?: string,
) {
  return configuredReportInputSchema
    .omit({ key: true })
    .transform((input): z.input<typeof configuredReportInputSchema> => ({
      ...input,
      key: existingKey ?? reportKeyFromName(input.name, "REPORT"),
    }))
    .pipe(configuredReportFormSchema(definition));
}
