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
  ChevronDown,
  Inbox,
} from "lucide-react";
import { Fragment, type ReactNode, useState } from "react";

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
  density?: "default" | "compact";
  emptyMessage?: string;
  footer?: ReactNode;
  minWidth?: number | string;
  renderExpandedRow?: (item: TData) => ReactNode;
  rowKey?: (item: TData) => string;
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
    return <ArrowUp className="size-3.5 text-brand-navy" />;
  }

  if (direction === "desc") {
    return <ArrowDown className="size-3.5 text-brand-navy" />;
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
  density,
  expandable,
  table,
}: {
  density: "default" | "compact";
  expandable: boolean;
  table: DataTableInstance<TData>;
}) {
  return (
    <thead className="border-b border-slate-200 bg-slate-100">
      {table.getHeaderGroups().map((group) => (
        <tr key={group.id}>
          {expandable ? (
            <th
              className={density === "compact" ? "w-12 px-4" : "w-14 px-5"}
            >
              <span className="sr-only">Expand row</span>
            </th>
          ) : null}
          {group.headers.map((header) => {
            const direction = header.column.getIsSorted();
            const canSort = header.column.getCanSort();

            return (
              <th
                key={header.id}
                aria-sort={ariaSort(direction, canSort)}
                className={cn(
                  "whitespace-nowrap text-left text-[11px] font-semibold tracking-[0.08em] text-slate-600",
                  density === "compact" ? "h-10 px-4" : "h-12 px-5",
                )}
              >
                {canSort ? (
                  <GeneralButton
                    type="button"
                    variant="ghost"
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "group h-auto gap-2 rounded-none p-0",
                      "justify-start text-left",
                      "text-[11px] font-semibold tracking-[0.08em] text-slate-600",
                      "hover:bg-transparent hover:text-slate-900",
                    )}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}

                    <SortIcon direction={direction}/>
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
  density,
  emptyMessage,
  expandedRows,
  renderExpandedRow,
  rowKey,
  rowClassName,
  toggleExpanded,
  table,
}: {
  density: "default" | "compact";
  emptyMessage: string;
  expandedRows: ReadonlySet<string>;
  renderExpandedRow?: (item: TData) => ReactNode;
  rowKey: (item: TData, index: number) => string;
  rowClassName?: (item: TData) => string | undefined;
  toggleExpanded: (key: string) => void;
  table: DataTableInstance<TData>;
}) {
  const rows = table.getRowModel().rows;

  return (
    <tbody className="divide-y divide-slate-200 bg-white">
      {rows.map((row, index) => {
        const key = rowKey(row.original, index);
        const expanded = expandedRows.has(key);

        return (
          <Fragment key={key}>
            <tr
              className={cn(
                "group transition-colors duration-150",
                "hover:bg-slate-50/80",
                rowClassName?.(row.original),
              )}
            >
              {renderExpandedRow ? (
                <td className={density === "compact" ? "px-4" : "px-5"}>
                  <GeneralButton
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse row" : "Expand row"}
                    className="size-8 p-0"
                    onClick={() => toggleExpanded(key)}
                    type="button"
                    variant="ghost"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-4 transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </GeneralButton>
                </td>
              ) : null}
              {row.getAllCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    "align-middle text-sm text-slate-700",
                    density === "compact"
                      ? "h-12 px-4 py-2"
                      : "h-[68px] px-5 py-3.5",
                  )}
                >
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
            {expanded && renderExpandedRow ? (
              <tr className="bg-slate-50/70">
                <td
                  className="px-5 py-4"
                  colSpan={table.getAllLeafColumns().length + 1}
                >
                  {renderExpandedRow(row.original)}
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}

      {!rows.length && (
        <tr>
          <td
            colSpan={
              table.getAllLeafColumns().length + (renderExpandedRow ? 1 : 0)
            }
            className={cn(
              "px-5 text-center",
              density === "compact" ? "py-10" : "py-16",
            )}
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
  density = "default",
  emptyMessage = "No records found",
  footer,
  minWidth,
  renderExpandedRow,
  rowKey,
  rowClassName,
  toolbar,
}: DataTableProps<TData>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
  });

  const resolvedMinWidth =
    typeof minWidth === "number" ? `${minWidth}px` : minWidth;
  const resolveRowKey = (item: TData, index: number) =>
    rowKey?.(item) ?? String(index);
  const toggleExpanded = (key: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-100 bg-white shadow-sm mx-1">
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
          <DataTableHeader
            density={density}
            expandable={Boolean(renderExpandedRow)}
            table={table}
          />

          <DataTableBody
            density={density}
            table={table}
            emptyMessage={emptyMessage}
            expandedRows={expandedRows}
            renderExpandedRow={renderExpandedRow}
            rowKey={resolveRowKey}
            rowClassName={rowClassName}
            toggleExpanded={toggleExpanded}
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
