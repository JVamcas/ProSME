"use client";

import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import type {
  AnalyticsSourceResult,
  WebsiteOrderedFunnel,
} from "../../domain/WebsiteAnalyticsMetrics";
import type { WebsiteSelfCheckJourney } from "../../domain/WebsiteAnalyticsPanels";
import { analyticsCount, analyticsPercent } from "./WebsiteAnalyticsFormatting";
import { WebsiteAnalyticsPanelFrame } from "./WebsiteAnalyticsPanel";

type JourneyRow = {
  path: string;
  completed: number | null;
  rate: number | null;
  note: string | null;
};

function journeyRow<T extends { viewedUsers: number }>(
  path: string,
  result: AnalyticsSourceResult<T>,
  completed: (data: T) => number,
): JourneyRow {
  const usable =
    result.data !== null &&
    ["ready", "stale", "no-data"].includes(result.state);
  const count = usable ? completed(result.data!) : null;
  const viewed = usable ? result.data!.viewedUsers : 0;
  return {
    path,
    completed: count,
    rate: count !== null && viewed > 0 ? count / viewed : null,
    note: result.note,
  };
}

const columns: DataTableColumn<JourneyRow>[] = [
  {
    accessorKey: "path",
    header: "Journey",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-start gap-2">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-xs">
          {row.index + 1}
        </span>
        <span>{row.original.path}</span>
        {row.original.note ? (
          <>
            <InfoTooltip content={row.original.note} />
            <span className="sr-only">{row.original.note}</span>
          </>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "completed",
    header: "Completed",
    enableSorting: false,
    cell: ({ row }) => row.original.completed === null
      ? "Unavailable"
      : analyticsCount(row.original.completed),
  },
  {
    accessorKey: "rate",
    header: "Rate",
    enableSorting: false,
    cell: ({ row }) => row.original.rate === null
      ? "—"
      : analyticsPercent(row.original.rate),
  },
];

export function WebsiteUserJourneys({
  application,
  selfCheck,
  scope,
}: {
  application: AnalyticsSourceResult<WebsiteOrderedFunnel>;
  selfCheck: AnalyticsSourceResult<WebsiteSelfCheckJourney>;
  scope: string;
}) {
  const rows = [
    journeyRow(
      "View → eligibility check → start → submit",
      application,
      (data) => data.submittedUsers,
    ),
    journeyRow(
      "Call viewed → eligibility self-check completed",
      selfCheck,
      (data) => data.completedSelfCheckUsers,
    ),
  ];
  return (
    <WebsiteAnalyticsPanelFrame
      title="User journeys"
      description="Completion of tracked paths"
      contentHeight={244}
      details={`${scope}. Completed counts tracked users completing each ordered path. Rate is completed users divided by viewers of that path; paths may overlap.`}
    >
      <span className="sr-only">{scope}</span>
      <DataTable
        columns={columns}
        data={rows}
        density="compact"
        minWidth={300}
        viewportHeight={240}
      />
    </WebsiteAnalyticsPanelFrame>
  );
}
