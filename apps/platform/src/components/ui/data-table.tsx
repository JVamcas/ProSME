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
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Inbox,
} from "lucide-react";
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

function SortIcon({
  direction,
}: {
  direction: false | "asc" | "desc";
}) {
  if (direction === "asc") {
    return <ArrowUp className="size-3.5 text-brand-orange" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5 text-brand-orange" />;
  }

  return (
    <ArrowUpDown className="size-3.5 text-brand-orange/70 transition-colors group-hover:text-brand-orange" />
  );
}

function ariaSort(
  direction: false | "asc" | "desc",
  canSort: boolean,
) {
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
    <thead className="border-b border-slate-200 bg-slate-50">
      {table.getHeaderGroups().map((group) => (
        <tr key={group.id}>
          {group.headers.map((header) => {
            const direction = header.column.getIsSorted();
            const canSort = header.column.getCanSort();

            return (
              <th
                key={header.id}
                aria-sort={ariaSort(direction, canSort)}
                className="h-12 whitespace-nowrap px-5 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600"
              >
                {canSort ? (
                  <GeneralButton
                    type="button"
                    variant="ghost"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "group h-auto gap-2 rounded-none p-0",
                      "justify-start text-left",
                      "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600",
                      "hover:bg-transparent hover:text-slate-900",
                    )}
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
    <tbody className="divide-y divide-slate-200 bg-white">
      {rows.map((row) => (
        <tr
          key={row.id}
          className={cn(
            "group transition-colors duration-150",
            "hover:bg-slate-50/80",
            rowClassName?.(row.original),
          )}
        >
          {row.getAllCells().map((cell) => (
            <td
              key={cell.id}
              className="h-[68px] px-5 py-3.5 align-middle text-sm text-slate-700"
            >
              <table.FlexRender cell={cell} />
            </td>
          ))}
        </tr>
      ))}

      {!rows.length && (
        <tr>
          <td
            colSpan={table.getAllLeafColumns().length}
            className="px-5 py-16 text-center"
          >
            <div className="flex flex-col items-center justify-center">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100">
                <Inbox className="size-5 text-slate-400" />
              </div>

              <p className="text-sm font-medium text-slate-700">
                {emptyMessage}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Records will appear here when available.
              </p>
            </div>
          </td>
        </tr>
      )}
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
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
  });

  const resolvedMinWidth =
    typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mx-1">
      {toolbar ? (
        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <DataTableToolbar {...toolbar} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table
          className="w-full text-left"
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

      {footer ? (
        <div className="border-t border-slate-200 bg-white px-5 py-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}