"use client";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type { WebsiteAnalyticsMetrics } from "../../domain/WebsiteAnalyticsMetrics";
import {
  websiteMetricSources,
  websitePanelSources,
} from "../../domain/WebsiteAnalyticsSnapshots";

type SourceRow = {
  name: string;
  fetchedAt: string;
  state: string;
  notes: string;
};
const columns: DataTableColumn<SourceRow>[] = [
  { accessorKey: "name", header: "Source" },
  { accessorKey: "fetchedAt", header: "Fetched at" },
  { accessorKey: "state", header: "Coverage" },
  { accessorKey: "notes", header: "Notes" },
];

export function WebsiteReportSourceTable({
  metrics,
}: {
  metrics: WebsiteAnalyticsMetrics;
}) {
  const rows = [
    ...websiteMetricSources,
    ...websitePanelSources,
    "eligibility" as const,
  ].map((name) => {
    const source = metrics[name];
    const notes = [source.note];
    if (source.metadata?.sampled) notes.push("Sampled data");
    if (source.metadata?.subjectToThresholding)
      notes.push("Privacy thresholding");
    if (source.metadata?.dataLossFromOtherRow)
      notes.push("Some values grouped into (other)");
    return {
      name,
      fetchedAt: source.fetchedAt ?? "Unavailable",
      state: source.state,
      notes: notes.filter(Boolean).join(" · "),
    };
  });
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(row) => row.name}
      toolbar={{ title: "Saved source metadata" }}
    />
  );
}
