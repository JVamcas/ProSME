"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { GeneralButton } from "./button";
import { FormSelect } from "./form-fields";

export const DEFAULT_PAGE_SIZE = 10;

type PaginationProps = {
  disabled?: boolean;
  hasNextPage: boolean;
  onNext: () => void;
  onPageSizeChange?: (pageSize: number) => void;
  onPrevious: () => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  total: number;
};

export function Pagination({
  disabled = false,
  hasNextPage,
  onNext,
  onPageSizeChange,
  onPrevious,
  page,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  total,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-brand-navy/10 pt-5 sm:flex-row"
    >
      <p aria-live="polite" className="text-sm text-brand-navy/65">
        Showing {firstItem}–{lastItem} of {total}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onPageSizeChange ? (
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
        ) : null}
        <div className="flex items-center gap-3">
          <GeneralButton
            disabled={disabled || page === 1}
            onClick={onPrevious}
            size="compact"
            type="button"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Previous
          </GeneralButton>
          <span className="min-w-20 text-center text-sm font-semibold text-brand-navy">
            Page {page} of {totalPages}
          </span>
          <GeneralButton
            disabled={disabled || !hasNextPage}
            onClick={onNext}
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
