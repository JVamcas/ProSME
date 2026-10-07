"use client";
import { requestData } from "@/lib/client-http";
import {
  websiteReportListSchema,
  websiteScheduleUpdateSchema,
  type WebsiteReportListInput,
  type WebsiteScheduleUpdateInput,
} from "./api/WebsiteReportSchemas";
import type {
  WebsiteReportDetail,
  WebsiteReportSchedule,
  WebsiteReportSummary,
} from "./domain/WebsiteReport";

export type WebsiteReportHistory = {
  rows: WebsiteReportSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type WebsiteReportSettings = {
  schedules: WebsiteReportSchedule[];
  propertyTimezone: string | null;
  collectionStart: string | null;
};

export const clientWebsiteReportService = {
  list(input: WebsiteReportListInput, signal?: AbortSignal) {
    const values = websiteReportListSchema.parse(input);
    const parameters = new URLSearchParams({
      page: String(values.page),
      pageSize: String(values.pageSize),
    });
    if (values.frequency) parameters.set("frequency", values.frequency);
    return requestData<WebsiteReportHistory>(
      `/api/reporting/website-reports?${parameters}`,
      { signal },
    );
  },
  detail(id: string, signal?: AbortSignal) {
    return requestData<WebsiteReportDetail>(
      `/api/reporting/website-reports/${encodeURIComponent(id)}`,
      { signal },
    );
  },
  settings(signal?: AbortSignal) {
    return requestData<WebsiteReportSettings>(
      "/api/reporting/website-schedules",
      { signal },
    );
  },
  update(id: string, input: WebsiteScheduleUpdateInput) {
    return requestData<WebsiteReportSchedule>(
      `/api/reporting/website-schedules/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(websiteScheduleUpdateSchema.parse(input)),
      },
    );
  },
};
