"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { GeneralButton } from "./button";

type PaginationProps = {
  disabled?: boolean;
  hasNextPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pageSize: number;
  total: number;
};

export function Pagination({
  disabled = false,
  hasNextPage,
  onNext,
  onPrevious,
  page,
  pageSize,
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
      <div className="flex items-center gap-3">
        <GeneralButton
          disabled={disabled || page === 1}
          onClick={onPrevious}
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
          type="button"
          variant="outline"
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </GeneralButton>
      </div>
    </nav>
  );
}
