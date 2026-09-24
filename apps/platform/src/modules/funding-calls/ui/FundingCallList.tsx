"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CloneButton, DeleteButton } from "@/components/ui/action-buttons";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import { toast } from "@/shared/ui/Toast";
import type { FundingCallView } from "../api/FundingCallTransport";
import {
  useCloneFundingCall,
  useDeleteFundingCall,
  useFundingCalls,
} from "../FundingCallHooks";

function columns(input: {
  canClone: boolean;
  canDelete: boolean;
  cloningId?: string;
  deletingId?: string;
  onClone: (call: FundingCallView) => void;
  onDelete: (call: FundingCallView) => void;
}): DataTableColumn<FundingCallView>[] {
  return [
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
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <CloneButton
            disabled={!input.canClone}
            isLoading={input.cloningId === row.original.id}
            onClick={() => input.onClone(row.original)}
            title={`Clone ${row.original.title}`}
          />
          <DeleteButton
            disabled={!input.canDelete}
            isLoading={input.deletingId === row.original.id}
            onClick={() => input.onDelete(row.original)}
            title={`Delete ${row.original.title}`}
          />
        </div>
      ),
    },
  ];
}

export function FundingCallList({
  canCreate,
  canDelete,
  fundingCallId,
}: {
  canCreate: boolean;
  canDelete: boolean;
  fundingCallId?: string;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteCandidate, setDeleteCandidate] = useState<FundingCallView>();
  const query = useFundingCalls(page, pageSize, fundingCallId);
  const cloneCall = useCloneFundingCall();
  const deleteCall = useDeleteFundingCall();

  function handleClone(call: FundingCallView) {
    cloneCall.mutate(call.id, {
      onError: (error) => toast.error(error.message),
      onSuccess: (cloned) => {
        toast.success(`${call.title} was cloned as a new draft.`);
        router.push(`/admin/funding-calls/${cloned.id}`);
      },
    });
  }

  function handleDelete() {
    if (!deleteCandidate) return;
    deleteCall.mutate(deleteCandidate.id, {
      onError: (error) => toast.error(error.message),
      onSuccess: () => {
        toast.success(`${deleteCandidate.title} was deleted.`);
        setDeleteCandidate(undefined);
      },
    });
  }

  return (
    <>
      <DataTable
        columns={columns({
          canClone: canCreate,
          canDelete,
          cloningId: cloneCall.isPending ? cloneCall.variables : undefined,
          deletingId: deleteCall.isPending ? deleteCall.variables : undefined,
          onClone: handleClone,
          onDelete: setDeleteCandidate,
        })}
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
      <ConfirmationDialog
        confirmText="Delete funding call"
        errorMessage={deleteCall.error?.message}
        isDangerous
        isLoading={deleteCall.isPending}
        isOpen={Boolean(deleteCandidate)}
        loadingText="Deleting…"
        message={deleteCandidate
          ? `Delete ${deleteCandidate.title}? Funding calls with applications cannot be deleted. This action cannot be undone.`
          : ""}
        onCancel={() => setDeleteCandidate(undefined)}
        onConfirm={handleDelete}
        title="Delete funding call"
      />
    </>
  );
}
