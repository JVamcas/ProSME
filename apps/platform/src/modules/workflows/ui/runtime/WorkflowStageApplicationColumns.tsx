import Link from "next/link";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { DataTableColumn } from "@/shared/ui/DataTable";
import type { WorkflowStageApplication } from "../../api/WorkflowStageFunnelTypes";

export const workflowStageApplicationColumns: DataTableColumn<WorkflowStageApplication>[] =
  [
    {
      enableSorting: false,
      accessorKey: "applicantName",
      header: "Applicant / business",
      cell: ({ row }) => (
        <div className="min-w-48 space-y-1">
          <Link
            className="font-semibold text-brand-orange hover:underline"
            href={`/admin/applications/${row.original.applicationId}`}
          >
            {row.original.applicantName}
          </Link>
          <p>{row.original.businessName ?? row.original.legalName ?? "—"}</p>
          <p className="text-xs text-brand-navy/60">{row.original.reference}</p>
        </div>
      ),
    },
    {
      id: "businessDetails",
      enableSorting: false,
      header: "Business details",
      cell: ({ row }) => (
        <div className="min-w-40 space-y-1">
          <p>{row.original.legalName ?? "—"}</p>
          <p>{row.original.registrationNumber ?? "—"}</p>
          <p>
            {[
              row.original.businessType,
              row.original.sector,
              row.original.region,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      enableSorting: false,
      accessorKey: "reachedAt",
      header: "Reached stage",
      cell: ({ row }) => (
        <div className="min-w-32">
          <p>{formatLocalDateTime24(row.original.reachedAt)}</p>
          <p className="text-xs text-brand-navy/60">
            Run {row.original.iterationNumber}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "fundingCallTitle",
      header: "Funding call",
      enableSorting: false,
    },
    {
      enableSorting: false,
      accessorKey: "averageScore",
      header: "Avg. score",
      cell: ({ row }) =>
        row.original.averageScore === null
          ? "—"
          : `${row.original.averageScore.toFixed(2)}%`,
    },
    {
      enableSorting: false,
      accessorKey: "comments",
      header: "Comments",
      cell: ({ row }) => (
        <p className="min-w-48 whitespace-pre-wrap">
          {row.original.comments ?? "—"}
        </p>
      ),
    },
  ];
