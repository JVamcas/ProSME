"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";

export function DataTablePagination({
  disabled = false,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  total,
  totalPages,
}: {
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  total: number;
  totalPages: number;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const visiblePage = totalPages === 0 ? 0 : page;

  return (
    <nav
      aria-label="Table pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p aria-live="polite" className="text-sm text-slate-600">
        {total === 0 ? "No results" : `Showing ${first}–${last} of ${total}`}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FormSelect
          aria-label="Rows per page"
          className="h-9 min-w-20 rounded-lg px-3"
          containerClassName="grid grid-cols-[auto_5rem] items-center gap-2"
          disabled={disabled}
          items={pageSizeOptions.map((value) => ({
            label: String(value),
            value,
          }))}
          label="Rows"
          labelClassName="mb-0 text-sm font-medium text-slate-600"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        />
        <div className="flex items-center gap-2">
          <GeneralButton
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            size="compact"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Previous
          </GeneralButton>
          <span className="min-w-24 text-center text-sm font-semibold text-brand-navy">
            Page {visiblePage} of {totalPages}
          </span>
          <GeneralButton
            disabled={disabled || totalPages === 0 || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            size="compact"
            type="button"
            variant="outline"
          >
            Next
            <ChevronRight aria-hidden="true" className="size-4" />
          </GeneralButton>
        </div>
      </div>
    </nav>
  );
}
