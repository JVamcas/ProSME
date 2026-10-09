import type { ReportingEventContext } from "./NotificationReportingEvent";

export function reportingRenderValues(
  context: ReportingEventContext,
  recipientName: string,
  baseUrl: string,
) {
  return {
    platformName: "SME Fund Namibia",
    recipientName,
    reportName: context.reportName,
    runId: context.runId,
    trigger: context.trigger,
    timezone: context.timezone,
    startDate: context.startDate ?? "Not applicable",
    endDate: context.endDate ?? "Not applicable",
    occurredAt: context.occurredAt,
    rows: context.rows === null ? "Not applicable" : String(context.rows),
    durationSeconds:
      context.durationSeconds === null
        ? "Not applicable"
        : String(context.durationSeconds),
    reportUrl: new URL(
      `/admin/reports/${context.reportId}`,
      baseUrl,
    ).toString(),
  };
}
