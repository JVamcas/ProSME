"use client";
import Link from "next/link";
import { PageShell } from "@/shared/ui/PageShell";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { ConfiguredReportCatalogueRow } from "../../domain/Report";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useReportCatalogueFilters } from "../useReportCatalogueFilters";
import { useReports } from "./useReports";
import { ArrowLink } from "@/components/ui/links";

const columns: DataTableColumn<ConfiguredReportCatalogueRow>[] = [
  {
    accessorKey: "name",
    header: "Report",
    cell: ({ row }) => (
      <ArrowLink href={`/admin/reports/${row.original.id}`}>
        {row.original.name}
      </ArrowLink>
    ),
  },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "templateVersion", header: "Template version" },
  { accessorKey: "format", header: "Default format" },
];
export function ReportCatalogue({ permissions }: { permissions: string[] }) {
  const filters = useReportCatalogueFilters();
  const query = useReports(filters.input);
  return (
    <PageShell
      eyebrow="Reporting / Configured Reports"
      title="Reports"
      description="Configured reports and manual generation"
    >
      <QuerySection
        query={query}
        title="reports"
        loading={<Skeleton className="h-80" />}
      >
        {(data) => (
          <DataTable
            columns={columns.map((column) => ({
              ...column,
              enableSorting: false,
            }))}
            data={data.items}
            rowKey={(item) => item.id}
            viewportHeight={420}
            toolbar={{
              title: "Reports",
              actions: permissions.includes(
                permissionCodes.reportingReportCreateAll,
              ) ? (
                <GeneralButton asChild>
                  <Link href="/admin/reports/new">Create report</Link>
                </GeneralButton>
              ) : undefined,
            }}
            footer={
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                hasNextPage={data.page * data.pageSize < data.total}
                onNext={filters.next}
                onPrevious={filters.previous}
              />
            }
          />
        )}
      </QuerySection>
    </PageShell>
  );
}
