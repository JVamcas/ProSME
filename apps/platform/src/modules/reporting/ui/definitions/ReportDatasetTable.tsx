"use client";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Skeleton } from "@/shared/ui/Skeleton";
import type { ReportDataset } from "../../domain/ReportDataset";
import { useReportDatasets } from "./useReportDefinition";

const columns: DataTableColumn<ReportDataset>[] = [
  { accessorKey: "name", header: "Dataset" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "version", header: "Version" },
  { id: "scope", header: "Scope", cell: () => "All authorized records" },
];
export function ReportDatasetTable() {
  const query = useReportDatasets();
  return (
    <QuerySection
      query={query}
      title="datasets"
      loading={<Skeleton className="h-80" />}
    >
      {(datasets) => (
        <DataTable
          columns={columns}
          data={datasets}
          rowKey={(item) => `${item.key}/${item.version}`}
          viewportHeight={420}
          renderExpandedRow={(dataset) => (
            <ReportDatasetDetails dataset={dataset} />
          )}
        />
      )}
    </QuerySection>
  );
}
export function ReportDatasetDetails({ dataset }: { dataset: ReportDataset }) {
  return (
    <div className="space-y-4">
      {dataset.definition.relations.map((relation) => (
        <div key={relation.name}>
          <h3 className="font-semibold">{relation.name}</h3>
          <p className="text-sm">{relation.grain}</p>
          <DataTable
            data={relation.columns}
            rowKey={(column) => column.name}
            columns={[
              { accessorKey: "name", header: "Column" },
              { accessorKey: "type", header: "Type" },
              {
                accessorKey: "nullable",
                header: "Nullable",
                cell: ({ row }) => (row.original.nullable ? "Yes" : "No"),
              },
            ]}
          />
        </div>
      ))}
      {dataset.definition.joins.map((join) => (
        <p key={`${join.from}/${join.to}`}>
          {join.from} → {join.to} ({join.cardinality})
        </p>
      ))}
      <p>Permitted functions: {dataset.definition.functions.join(", ")}</p>
      {dataset.definition.notes.map((note) => (
        <p key={note} className="text-sm">
          {note}
        </p>
      ))}
    </div>
  );
}
