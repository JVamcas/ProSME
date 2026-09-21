"use client";

import Link from "next/link";
import { useState } from "react";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import type { FundingCallView } from "../api/FundingCallTransport";
import { useFundingCalls } from "../FundingCallHooks";

const columns: DataTableColumn<FundingCallView>[] = [
  {
    accessorKey: "title",
    header: "Funding call",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <Link
          className="font-semibold text-brand-orange underline"
          href={`/admin/funding-calls/${row.original.id}`}
        >
          {row.original.title}
        </Link>
        <span>{row.original.reference}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "opensAt",
    header: "Opens",
    cell: ({ row }) => formatLocalDateTime24(row.original.opensAt),
  },
  {
    accessorKey: "closesAt",
    header: "Closes",
    cell: ({ row }) => formatLocalDateTime24(row.original.closesAt),
  },
];

export function FundingCallList({
  canCreate,
  fundingCallId,
}: {
  canCreate: boolean;
  fundingCallId?: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useFundingCalls(page, pageSize, fundingCallId);

  return (
    <DataTable
      columns={columns}
      data={query.data?.items ?? []}
      emptyMessage={
        query.isPending
          ? "Loading funding calls…"
          : query.error?.message ?? "No funding calls configured."
      }
      footer={(
        <DataTablePagination
          disabled={query.isFetching}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          page={query.data?.page ?? page}
          pageSize={query.data?.pageSize ?? pageSize}
          total={query.data?.total ?? 0}
          totalPages={query.data?.totalPages ?? 0}
        />
      )}
      rowKey={(call) => String(call.id)}
      toolbar={{
        actions: (
          <>
            {fundingCallId ? (
              <GeneralButtonLink
                href="/admin/funding-calls"
                variant="outline"
              >
                Clear filter
              </GeneralButtonLink>
            ) : null}
            {canCreate ? (
              <GeneralButtonLink href="/admin/funding-calls/new">
                Create funding call
              </GeneralButtonLink>
            ) : (
              <GeneralButton disabled>
                Create funding call
              </GeneralButton>
            )}
          </>
        ),
        description: fundingCallId
          ? "Showing the funding call selected from its eligibility ruleset."
          : undefined,
        title: fundingCallId ? "Filtered funding call" : undefined,
      }}
    />
  );
}
