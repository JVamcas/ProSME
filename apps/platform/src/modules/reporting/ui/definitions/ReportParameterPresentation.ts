import type { ReportParameterDefinition } from "../../domain/ReportParameters";

export const reportParameterBindingLabels: Record<
  ReportParameterDefinition["binding"],
  string
> = {
  value: "Entered value",
  "run-at": "Run time",
  "source-timezone": "Source timezone",
};

export function reportParameterDefaultLabel(
  parameter: ReportParameterDefinition,
) {
  if (parameter.binding !== "value" || parameter.defaultValue === undefined) {
    return "—";
  }
  if (parameter.defaultValue === null) {
    return "No value";
  }
  if (Array.isArray(parameter.defaultValue)) {
    return JSON.stringify(parameter.defaultValue);
  }
  if (parameter.defaultValue === "") {
    return "Empty text";
  }
  return String(parameter.defaultValue);
}
