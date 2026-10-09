import type { ConfiguredReport } from "../../domain/Report";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";
import {
  reportParameterBindingLabels,
  reportParameterDefaultLabel,
} from "../definitions/ReportParameterPresentation";

export const reportPeriodPresentation = {
  explicit: {
    label: "Current snapshot",
    description: "Uses explicit parameter values at the time the report runs.",
  },
  "previous-month": {
    label: "Previous complete month",
    description:
      "Uses the previous complete calendar month when the report runs.",
  },
  "website-completed": {
    label: "Collection start through yesterday",
    description: "Uses completed days from the website collection start date.",
  },
} satisfies Record<
  ConfiguredReport["defaults"]["period"],
  {
    label: string;
    description: string;
  }
>;

const parameterLabels: Record<string, string> = {
  fundingCallId: "Funding call",
  stageCode: "Workflow stage",
  minimumAgeHours: "Minimum age",
};

export function reportParameterName(name: string) {
  const label = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ");
  return (
    parameterLabels[name] ?? label.charAt(0).toUpperCase() + label.slice(1)
  );
}

export function reportSavedParameterValue(
  report: ConfiguredReport,
  parameter: ReportParameterDefinition,
) {
  if (parameter.binding !== "value") {
    return {
      label: reportParameterBindingLabels[parameter.binding],
      detail: "Set when the report runs",
    };
  }
  const savedValue = report.defaults.values[parameter.name];
  const hasSavedValue =
    Object.hasOwn(report.defaults.values, parameter.name) &&
    savedValue !== undefined;
  if (report.defaults.period !== "explicit" && !hasSavedValue) {
    if (parameter.name === "startDate") {
      return {
        label:
          report.defaults.period === "previous-month"
            ? "Previous month start"
            : "Collection start",
        detail: "Calculated when the report runs",
      };
    }
    if (parameter.name === "endDate") {
      return {
        label:
          report.defaults.period === "previous-month"
            ? "Previous month end"
            : "Yesterday",
        detail: "Calculated when the report runs",
      };
    }
  }
  const value = hasSavedValue ? savedValue : parameter.defaultValue;
  if (value === undefined) {
    return { label: "Not set", detail: "Required when the report runs" };
  }
  const label = reportParameterDefaultLabel({
    ...parameter,
    defaultValue: value,
  });
  return {
    label:
      parameter.name === "minimumAgeHours" && typeof value === "number"
        ? `${label} ${value === 1 ? "hour" : "hours"}`
        : label,
    detail: value === null ? "No value set" : undefined,
  };
}
