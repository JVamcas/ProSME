"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { DataTable } from "@/shared/ui/DataTable";
import { RightDrawer } from "@/shared/ui/RightDrawer";
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
}: {
  id: string;
  canEdit: boolean;
  rowVersion: number;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const versions = useFundingCallVersions(id, page);
  const history = useFundingCallVersion(id, selected);
  const prepare = usePrepareFundingCallReplacement(id);
  return (
    <section className="mt-6 space-y-3">
      <h2 className="text-xl font-bold text-brand-navy">Published versions</h2>
      <DataTable
        data={versions.data?.items ?? []}
        emptyMessage={
          versions.isPending ? "Loading versions…" : "No published versions"
        }
        columns={[
          { accessorKey: "versionNumber", header: "Version" },
          { accessorKey: "title", header: "Title" },
          {
            accessorKey: "publishedAt",
            header: "Published",
            cell: ({ row }) =>
              new Date(row.original.publishedAt).toLocaleString(),
          },
          {
            accessorKey: "current",
            header: "Publication",
            cell: ({ row }) =>
              row.original.current ? "Current" : "Superseded",
          },
          {
            id: "view",
            header: "",
            cell: ({ row }) => (
              <ActionMenu
                label={`Actions for version ${row.original.versionNumber}`}
                items={[
                  {
                    id: "view-version",
                    label: "View version",
                    onAction: () => setSelected(row.original.id),
                  },
                  ...(canEdit
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
        title="Published funding call version"
      >
        {history.isPending ? <p>Loading version…</p> : null}
        {history.data ? (
          <FundingCallReadOnlyReview call={history.data} />
        ) : null}
      </RightDrawer>
    </section>
  );
}
