"use client";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/components/ui/button";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { ReportSchedule } from "../../domain/ReportSchedule";
import { useReportSchedules } from "./useReportAutomation";
import { ReportScheduleForm } from "./ReportScheduleForm";

export function ReportSchedulesPanel({
  reportId,
  timezone,
  canUpdate,
}: {
  reportId: string;
  timezone: string;
  canUpdate: boolean;
}) {
  const query = useReportSchedules(reportId);
  const [editing, setEditing] = useState<ReportSchedule | "new" | null>(null);
  const columns: DataTableColumn<ReportSchedule>[] = [
    { accessorKey: "anchor", header: "Anchor date" },
    { accessorKey: "frequencyDays", header: "Frequency (days)" },
    { accessorKey: "timezone", header: "Timezone" },
    { accessorKey: "nextDueAt", header: "Next generation" },
    { accessorKey: "sendTime", header: "Generation time" },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (row.original.enabled ? "Enabled" : "Disabled"),
    },
    { accessorKey: "error", header: "Preparation issue" },
    ...(canUpdate
      ? [
          {
            id: "edit",
            header: "Actions",
            cell: ({ row }: { row: { original: ReportSchedule } }) => (
              <GeneralButton
                variant="ghost"
                onClick={() => setEditing(row.original)}
              >
                Edit
              </GeneralButton>
            ),
          },
        ]
      : []),
  ];
  return (
    <>
      <QuerySection
        query={query}
        title="schedules"
        loading={<Skeleton className="h-64" />}
      >
        {(schedules) => (
          <DataTable
            data={schedules}
            columns={columns.map((column) => ({
              ...column,
              enableSorting: false,
            }))}
            rowKey={(schedule) => schedule.id}
            toolbar={{
              title: "Schedules",
              description:
                "Missed periods run oldest first. Email delivery follows saved generation.",
              actions: canUpdate ? (
                <GeneralButton onClick={() => setEditing("new")}>
                  Add schedule
                </GeneralButton>
              ) : undefined,
            }}
          />
        )}
      </QuerySection>
      <RightDrawer
        title="Report schedule"
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
      >
        {editing ? (
          <ReportScheduleForm
            key={editing === "new" ? "new" : editing.id}
            reportId={reportId}
            timezone={timezone}
            schedule={editing === "new" ? undefined : editing}
            onSaved={() => setEditing(null)}
          />
        ) : null}
      </RightDrawer>
    </>
  );
}
