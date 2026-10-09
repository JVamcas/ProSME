"use client";
import { requestData } from "@/lib/client-http";
import type {
  ReportSchedule,
  ReportScheduleInput,
} from "./domain/ReportSchedule";
import type { NotificationEventRuleSummary } from "@/modules/notifications/api/NotificationAdministrationSchemas";

const base = (reportId: string) => `/api/reporting/reports/${reportId}`;
export const clientReportAutomationService = {
  schedules: (reportId: string, signal?: AbortSignal) =>
    requestData<ReportSchedule[]>(`${base(reportId)}/schedules`, { signal }),
  saveSchedule: (reportId: string, input: ReportScheduleInput, id?: string) =>
    requestData<{ id: string }>(
      `${base(reportId)}/schedules${id ? `/${id}` : ""}`,
      {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
    ),
  delivery: (reportId: string, signal?: AbortSignal) =>
    requestData<NotificationEventRuleSummary[]>(`${base(reportId)}/delivery`, {
      signal,
    }),
};
