"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { DataTable } from "@/shared/ui/DataTable";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  FundingCallView,
  FundingCallVersionItem,
} from "../api/FundingCallTransport";
import { FundingCallVersionContext } from "./FundingCallVersionContext";
import {
  useFundingCallVersion,
  useFundingCallVersions,
  usePrepareFundingCallReplacement,
} from "../FundingCallHooks";
import { FundingCallReadOnlyReview } from "./FundingCallReadOnlyReview";

export function FundingCallVersionsPanel({
  id,
  canEdit,
  rowVersion,
  call,
}: {
  id: string;
  canEdit: boolean;
  rowVersion: number;
  call?: FundingCallView;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FundingCallVersionItem | null>(null);
  const versions = useFundingCallVersions(id, page);
  const history = useFundingCallVersion(
    id,
    selected?.kind === "working" ? null : (selected?.id ?? null),
  );
  const displayedCall = selected?.kind === "working" ? call : history.data;
  const prepare = usePrepareFundingCallReplacement(id);
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xl font-bold text-brand-navy">Versions</h2>
      <DataTable
        data={versions.data?.items ?? []}
        emptyMessage={versions.isPending ? "Loading versions…" : "No versions"}
        columns={[
          {
            accessorKey: "versionNumber",
            header: "Version",
            cell: ({ row }) =>
              row.original.kind === "working"
                ? `Unpublished${row.original.sourceVersionNumber ? ` · Based on version ${row.original.sourceVersionNumber}` : ""}`
                : `Version ${row.original.versionNumber}`,
          },
          { accessorKey: "title", header: "Title" },
          {
            accessorKey: "publishedAt",
            header: "Published",
            cell: ({ row }) =>
              row.original.publishedAt
                ? new Date(row.original.publishedAt).toLocaleString()
                : "Not published",
          },
          {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
          },
          {
            id: "view",
            header: "",
            cell: ({ row }) => (
              <ActionMenu
                label={
                  row.original.kind === "working"
                    ? "Actions for unpublished version"
                    : `Actions for version ${row.original.versionNumber}`
                }
                items={[
                  {
                    id: "view-version",
                    label: "View version",
                    onAction: () => setSelected(row.original),
                  },
                  ...(canEdit && row.original.kind !== "working"
                    ? [
                        {
                          id: "edit-version",
                          label: "Edit",
                          disabled: prepare.isPending,
                          onAction: () =>
                            prepare.mutate(
                              {
                                expectedRowVersion: rowVersion,
                                sourceVersionId: row.original.id,
                              },
                              {
                                onSuccess: () => setSelected(null),
                                onError: (error) => toast.error(error.message),
                              },
                            ),
                        },
                      ]
                    : []),
                ]}
              />
            ),
          },
        ]}
      />
      <Pagination
        disabled={versions.isFetching}
        hasNextPage={page * 10 < (versions.data?.total ?? 0)}
        onNext={() => setPage(page + 1)}
        onPrevious={() => setPage(page - 1)}
        page={page}
        pageSize={10}
        total={versions.data?.total ?? 0}
      />
      <RightDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="xl"
        title={
          selected?.kind === "working"
            ? "Unpublished funding call version"
            : `Funding call · Version ${selected?.versionNumber ?? ""} · Read-only`
        }
      >
        {selected?.kind !== "working" && history.isPending ? (
          <p>Loading version…</p>
        ) : null}
        {displayedCall ? (
          <>
            <p className="mb-4 text-sm text-brand-navy/65">
              <FundingCallVersionContext call={displayedCall} />
            </p>
            <FundingCallReadOnlyReview call={displayedCall} />
          </>
        ) : null}
      </RightDrawer>
    </section>
  );
}
