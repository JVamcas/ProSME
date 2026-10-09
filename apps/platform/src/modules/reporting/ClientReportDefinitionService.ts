"use client";
import { requestData } from "@/lib/client-http";
import type { ReportDataset } from "./domain/ReportDataset";
import type {
  ReportTemplate,
  ReportCatalogueRow,
  ReportPage,
  PublishedReportTemplate,
} from "./domain/ReportDefinition";
import type {
  ReportListInput,
  ReportTemplateInput,
} from "./api/ReportManagementSchemas";

const base = "/api/reporting/templates";
export const clientReportDefinitionService = {
  datasets: (signal?: AbortSignal) =>
    requestData<ReportDataset[]>("/api/reporting/datasets", { signal }),
  templates: (input: ReportListInput, signal?: AbortSignal) =>
    requestData<ReportPage<ReportCatalogueRow>>(
      `${base}?${new URLSearchParams({ search: input.search, page: String(input.page), pageSize: String(input.pageSize) })}`,
      { signal },
    ),
  template: (id: string, signal?: AbortSignal) =>
    requestData<ReportTemplate>(`${base}/${id}`, { signal }),
  published: (id: string, version: number, signal?: AbortSignal) =>
    requestData<PublishedReportTemplate>(`${base}/${id}/versions/${version}`, {
      signal,
    }),
  save: (input: ReportTemplateInput, id?: string) =>
    requestData<ReportTemplate>(id ? `${base}/${id}` : base, {
      headers: { "Content-Type": "application/json" },
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  validate: (
    id: string,
    rowVersion: number,
    values: Record<string, unknown>,
    publish: boolean,
  ) =>
    requestData(`${base}/${id}/${publish ? "publish" : "validate"}`, {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({ rowVersion, values }),
    }),
};
