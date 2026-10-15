"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { ArrowLink } from "@/shared/ui/Links";
import { GeneralButton } from "@/shared/ui/Button";
import { PageShell } from "@/shared/ui/PageShell";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Badge } from "@/shared/ui/Badge";
import { CapabilityGate } from "@/shared/ui/portal/capability-gate";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ApplicationAppealSummary } from "../../domain/ApplicationAppeal";
import { useApplicationAppeals } from "./useApplicationAppeals";
import { ApplicationAppealDetail } from "./ApplicationAppealDetail";
const labels = { NEW: "New", IN_PROGRESS: "In progress", RESOLVED: "Resolved" };
function columns(
  open: (id: string) => void,
): DataTableColumn<ApplicationAppealSummary>[] {
  return [
    {
      id: "reference",
      header: "Appeal",
      cell: ({ row }) => (
        <ArrowLink
          href={`/admin/process-monitor/application-appeals/${row.original.id}`}
          onClick={(event) => {
            if (
              event.button ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            open(row.original.id);
          }}
        >
          {row.original.reference}
        </ArrowLink>
      ),
    },
    {
      id: "application",
      header: "Application",
      cell: ({ row }) => (
        <ArrowLink href={`/admin/applications/${row.original.applicationId}`}>
          {row.original.applicationReference}
        </ArrowLink>
      ),
    },
    { accessorKey: "name", header: "Submitted by" },
    {
      id: "state",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline">{labels[row.original.state]}</Badge>
      ),
    },
    {
      id: "assignee",
      header: "Assigned to",
      cell: ({ row }) => row.original.assigneeName ?? "Unassigned",
    },
    {
      id: "created",
      header: "Received",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
  ];
}
function AppealQueueContent({ initialAppealId }: { initialAppealId?: string }) {
  const [selected, setSelected] = useState(initialAppealId);
  const query = useApplicationAppeals();
  const router = useRouter();
  const tableColumns = useMemo(() => columns(setSelected), []);
  function close() {
    setSelected(undefined);
    if (initialAppealId)
      router.replace("/admin/process-monitor/application-appeals");
  }
  return (
    <PageShell
      eyebrow="Process Monitor"
      title="Application Appeals Queue"
      description="Review, assign and resolve application appeals."
    >
      <QuerySection
        query={query}
        loading={<Skeleton className="h-48" />}
        title="application appeals"
      >
        {(data) => (
          <DataTable
            columns={tableColumns}
            data={data.pages.flatMap((page) => page.items)}
            rowKey={(row) => row.id}
            emptyMessage="No application appeals received."
            footer={
              query.hasNextPage ? (
                <GeneralButton
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  Load more appeals
                </GeneralButton>
              ) : undefined
            }
          />
        )}
      </QuerySection>
      {selected ? (
        <ApplicationAppealDetail key={selected} id={selected} onClose={close} />
      ) : null}
    </PageShell>
  );
}
export function ApplicationAppealsQueue({
  initialAppealId,
}: {
  initialAppealId?: string;
}) {
  return (
    <CapabilityGate
      any={[permissionCodes.applicationAppealReadAll]}
      mode="forbidden"
    >
      <AppealQueueContent initialAppealId={initialAppealId} />
    </CapabilityGate>
  );
}
