"use client";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import { Pagination } from "@/components/ui/pagination";
import { GeneralButton } from "@/components/ui/button";
import type { ReportCatalogueRow } from "../../domain/ReportDefinition";
import { useReportTemplates } from "./useReportDefinition";
import { useReportCatalogueFilters } from "../useReportCatalogueFilters";
import { ArrowLink } from "@/components/ui/links";

const columns: DataTableColumn<ReportCatalogueRow>[] = [
  {
    accessorKey: "name",
    header: "Template",
    cell: ({ row }) => (
      <div className="flex flex-col gap-2">
        <ArrowLink href={`/admin/reports/templates-definitions/${row.original.id ?? "--"}`}>
          {row.original.name}
        </ArrowLink>
        <span className="text-xs text-slate-600">{row.original.key} . v{row.original.publishedVersion}</span>
      </div>
    ),
  },
  { accessorKey: "description", header: "Description" }
];
export function ReportTemplateTable({ canCreate }: { canCreate: boolean }) {
  const filters = useReportCatalogueFilters();
  const query = useReportTemplates(filters.input);
  return (
    <>
      <QuerySection
        query={query}
        title="templates"
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
              title: "Report Templates",
              actions: canCreate ? (
                <GeneralButton asChild>
                  <Link href="/admin/reports/templates-definitions/new">
                    Create template
                  </Link>
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
    </>
  );
}
