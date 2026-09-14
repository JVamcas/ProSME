"use client";

import {
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ReactTable,
  type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GeneralButton } from "./button";
import {
  DataTableToolbar,
  type DataTableToolbarConfig,
} from "./data-table-toolbar";

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData
>;

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  emptyMessage?: string;
  footer?: ReactNode;
  minWidth?: number | string;
  rowClassName?: (item: TData) => string | undefined;
  toolbar?: DataTableToolbarConfig;
};

type DataTableInstance<TData extends RowData> = ReactTable<
  typeof dataTableFeatures,
  TData
>;

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") {
    return <ArrowUp className="size-3 text-brand-orange" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3 text-brand-orange" />;
  }

  return <ArrowUpDown className="size-3 text-brand-orange" />;
}

function ariaSort(direction: false | "asc" | "desc", canSort: boolean) {
  if (direction === "asc") {
    return "ascending" as const;
  }

  if (direction === "desc") {
    return "descending" as const;
  }

  return canSort ? ("none" as const) : undefined;
}

function DataTableHeader<TData extends RowData>({
  table,
}: {
  table: DataTableInstance<TData>;
}) {
  return (
    <thead className="bg-brand-white text-[10px] uppercase tracking-wider text-slate-400">
      {table.getHeaderGroups().map((group) => (
        <tr key={group.id}>
          {group.headers.map((header) => {
            const direction = header.column.getIsSorted();
            const canSort = header.column.getCanSort();

            return (
              <th
                key={header.id}
                className="px-5 py-3 font-bold"
                aria-sort={ariaSort(direction, canSort)}
              >
                {canSort ? (
                  <GeneralButton
                    type="button"
                    variant="ghost"
                    onClick={header.column.getToggleSortingHandler()}
                    className="h-auto justify-start rounded-none px-0 py-0 text-left text-inherit hover:bg-transparent"
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                    <SortIcon direction={direction} />
                  </GeneralButton>
                ) : header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

function DataTableBody<TData extends RowData>({
  emptyMessage,
  rowClassName,
  table,
}: {
  emptyMessage: string;
  rowClassName?: (item: TData) => string | undefined;
  table: DataTableInstance<TData>;
}) {
  const rows = table.getRowModel().rows;

  return (
    <tbody className="divide-y divide-slate-100">
      {rows.map((row) => (
        <tr
          key={row.id}
          className={cn(
            "transition hover:bg-brand-navy/10",
            rowClassName?.(row.original),
          )}
        >
          {row.getAllCells().map((cell) => (
            <td key={cell.id} className="px-5 py-4 text-slate-600">
              <table.FlexRender cell={cell} />
            </td>
          ))}
        </tr>
      ))}
      {!rows.length ? (
        <tr>
          <td
            colSpan={table.getAllLeafColumns().length}
            className="px-5 py-12 text-center text-slate-500"
          >
            <Inbox className="mx-auto mb-3 size-6 text-brand-orange" />
            {emptyMessage}
          </td>
        </tr>
      ) : null}
    </tbody>
  );
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = "No records found",
  footer,
  minWidth,
  rowClassName,
  toolbar,
}: DataTableProps<TData>) {
  const table = useTable({ features: dataTableFeatures, columns, data });
  const resolvedMinWidth =
    typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <>
      {toolbar ? <DataTableToolbar {...toolbar} /> : null}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs"
          style={{ minWidth: resolvedMinWidth }}
        >
          <DataTableHeader table={table} />
          <DataTableBody
            table={table}
            emptyMessage={emptyMessage}
            rowClassName={rowClassName}
          />
        </table>
      </div>
      {footer}
    </>
  );
}
