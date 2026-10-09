"use client";
import { requestBlob, requestData } from "@/lib/client-http";
import type {
  ConfiguredReportDetails,
  ConfiguredReportCatalogueRow,
  ReportRun,
  ReportRunSummary,
  ReportArtifact,
  ReportRunEvent,
} from "./domain/Report";
import type { ReportPage } from "./domain/ReportDefinition";
import type {
  ConfiguredReportInput,
  ReportListInput,
  ManualReportRunInput,
} from "./api/ReportManagementSchemas";

const base = "/api/reporting/reports";
function listQuery(input: ReportListInput) {
  return new URLSearchParams({
    search: input.search,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
}
export const clientReportService = {
  list: (input: ReportListInput, signal?: AbortSignal) =>
    requestData<ReportPage<ConfiguredReportCatalogueRow>>(
      `${base}?${listQuery(input)}`,
      { signal },
    ),
  detail: (id: string, signal?: AbortSignal) =>
    requestData<
      ConfiguredReportDetails & {
        runDefaults: Record<string, unknown> | null;
        runDefaultsError: string | null;
      }
    >(`${base}/${id}`, { signal }),
  save: (input: ConfiguredReportInput, id?: string) =>
    requestData<{ id: string }>(id ? `${base}/${id}` : base, {
      headers: { "Content-Type": "application/json" },
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  run: (id: string, input: ManualReportRunInput) =>
    requestData<{ id: string }>(`${base}/${id}/runs`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(input),
    }),
  runs: (id: string, input: ReportListInput, signal?: AbortSignal) =>
    requestData<ReportPage<ReportRunSummary>>(
      `${base}/${id}/runs?${listQuery(input)}`,
      { signal },
    ),
  runDetail: (id: string, runId: string, signal?: AbortSignal) =>
    requestData<{
      run: ReportRun;
      artifacts: ReportArtifact[];
      events: ReportRunEvent[];
    }>(`${base}/${id}/runs/${runId}`, { signal }),
  download: (id: string, runId: string, artifactId: string) =>
    requestBlob(`${base}/${id}/runs/${runId}/artifacts/${artifactId}`, {
      cache: "no-store",
    }),
  artifactUrl: (id: string, runId: string, artifactId: string) =>
    `${base}/${id}/runs/${runId}/artifacts/${artifactId}`,
};
