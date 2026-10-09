import { CircleAlert, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { formatDatePretty, parseDateYYYYMMDD } from "@/lib/dateUtils";
import type { ReportRun } from "../../domain/Report";
import type { ReportParameterDefinition } from "../../domain/ReportParameters";
import { reportParameterValueLabel } from "../definitions/ReportParameterPresentation";

export const reportRunStatusPresentation = {
  QUEUED: {
    label: "Queued",
    description: "Waiting for the report to start.",
    badge: "Pending",
    icon: Clock3,
    iconClassName: "text-brand-orange",
  },
  PREPARING_SOURCE: {
    label: "Preparing source",
    description: "Preparing the report data.",
    badge: "In progress",
    icon: LoaderCircle,
    iconClassName: "motion-safe:animate-spin text-brand-orange",
  },
  RUNNING: {
    label: "Generating report",
    description: "Generating the report file.",
    badge: "In progress",
    icon: LoaderCircle,
    iconClassName: "motion-safe:animate-spin text-brand-orange",
  },
  SUCCEEDED: {
    label: "Completed",
    description: "The report was generated successfully.",
    badge: "Success",
    icon: CheckCircle2,
    iconClassName: "text-brand-green",
  },
  FAILED: {
    label: "Generation failed",
    description: "The report could not be generated.",
    badge: "Failed",
    icon: CircleAlert,
    iconClassName: "text-red-700",
  },
} satisfies Record<ReportRun["status"], unknown>;

const eventLabels: Record<string, string> = {
  "reporting.generation.started": "Generation started",
  "reporting.generation.completed": "Generation completed",
  "reporting.generation.failed": "Generation failed",
};

export function reportRunEventLabel(key: string) {
  return eventLabels[key] ?? key;
}

export function reportRunParameterValue(
  value: unknown,
  definition?: ReportParameterDefinition,
) {
  if (
    definition?.type === "date" &&
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return formatDatePretty(parseDateYYYYMMDD(value));
  }
  return reportParameterValueLabel(value);
}
