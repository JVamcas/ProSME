"use client";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import type {
  BoundedWebsiteRows,
  WebsiteViewedPage,
} from "../../domain/WebsiteAnalyticsPanels";

const columns: DataTableColumn<WebsiteViewedPage>[] = [
  { accessorKey: "path", header: "Page" },
  { accessorKey: "pageViews", header: "Views" },
];
export function WebsiteMostViewedPages({
  data,
}: {
  data: BoundedWebsiteRows<WebsiteViewedPage>;
}) {
  return (
    <DataTable
      columns={columns}
      data={data.rows}
      density="compact"
      minWidth={200}
      footer={
        data.truncated
          ? "Top 10 page rows; additional pages are omitted."
          : undefined
      }
    />
  );
}
