import { z } from "zod";
import {
  bindReportParameters,
  type ReportParameterDefinition,
} from "./ReportParameters";

export function reportParameterValuesSchema(
  definitions: ReportParameterDefinition[],
) {
  return z.record(z.string(), z.unknown()).superRefine((values, context) => {
    if (
      typeof values.startDate === "string" &&
      typeof values.endDate === "string" &&
      values.startDate > values.endDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
    try {
      bindReportParameters({
        definitions,
        values,
        runAt: new Date().toISOString(),
        timezone: "Africa/Windhoek",
      });
    } catch (error) {
      if (!(error instanceof z.ZodError)) {
        throw error;
      }
      for (const issue of error.issues) {
        context.addIssue({
          code: "custom",
          path: issue.path,
          message: issue.message,
        });
      }
    }
  });
}

export function resolvedReportValues(
  definitions: ReportParameterDefinition[],
  values: Record<string, unknown>,
  runAt: string,
  timezone: string,
) {
  const bound = bindReportParameters({ definitions, values, runAt, timezone });
  return Object.fromEntries(
    definitions.flatMap((definition, index) =>
      definition.binding === "value" ? [[definition.name, bound[index]]] : [],
    ),
  );
}
