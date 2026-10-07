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
      viewportHeight={240}
      emptyMessage="No page views recorded"
    />
  );
}
