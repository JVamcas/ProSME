"use client";

import {
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GeneralButton } from "./button";

export type DataTableFilterProps = {
  applyLabel?: string;
  applyLoadingText?: string;
  children: ReactNode;
  className?: string;
  clearLabel?: string;
  collapsible?: boolean;
  contentClassName?: string;
  defaultExpanded?: boolean;
  description?: string;
  expanded?: boolean;
  footerActions?: ReactNode;
  headerActions?: ReactNode;
  isApplyDisabled?: boolean;
  isApplying?: boolean;
  isClearDisabled?: boolean;
  onApply?: () => void;
  onClear?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  title: string;
};

type FilterHeaderProps = Pick<
  DataTableFilterProps,
  | "clearLabel"
  | "collapsible"
  | "description"
  | "headerActions"
  | "isApplying"
  | "isClearDisabled"
  | "onClear"
  | "title"
> & {
  expanded: boolean;
  onToggle: () => void;
};

function FilterHeader({
  clearLabel,
  collapsible,
  description,
  expanded,
  headerActions,
  isApplying,
  isClearDisabled,
  onClear,
  onToggle,
  title,
}: FilterHeaderProps) {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/[0.06] text-brand-navy">
          <SlidersHorizontal aria-hidden="true" className="size-5" />
        </div>

        <div className="min-w-0">
          <div className="inline-flex rounded-lg bg-brand-navy/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-navy">
            {title}
          </div>

          {description ? (
            <p className="mt-2 text-sm leading-5 text-brand-navy/65">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {headerActions}

        {collapsible ? (
          <GeneralButton
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            onClick={onToggle}
            size="sm"
            type="button"
            variant="outline"
            className="gap-2"
          >
            {expanded ? "Hide filters" : "Show filters"}
            <Chevron aria-hidden="true" className="size-4" />
          </GeneralButton>
        ) : null}

        {onClear ? (
          <GeneralButton
            disabled={isClearDisabled || isApplying}
            onClick={onClear}
            size="sm"
            type="button"
            variant="ghost"
          >
            {clearLabel}
          </GeneralButton>
        ) : null}
      </div>
    </div>
  );
}

type FilterFooterProps = Pick<
  DataTableFilterProps,
  | "applyLabel"
  | "applyLoadingText"
  | "footerActions"
  | "isApplyDisabled"
  | "isApplying"
  | "isClearDisabled"
  | "clearLabel"
  | "onApply"
  | "onClear"
>;

function FilterFooter({
  applyLabel,
  applyLoadingText,
  footerActions,
  isApplyDisabled,
  isApplying,
  isClearDisabled,
  clearLabel,
  onApply,
  onClear,
}: FilterFooterProps) {
  if (!footerActions && !onApply && !onClear) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-brand-navy/10 pt-4">
      {footerActions}

      {onClear ? (
        <GeneralButton
          disabled={isClearDisabled || isApplying}
          onClick={onClear}
          type="button"
          variant="outline"
        >
          {clearLabel}
        </GeneralButton>
      ) : null}

      {onApply ? (
        <GeneralButton
          aria-busy={isApplying}
          disabled={isApplyDisabled || isApplying}
          onClick={onApply}
          type="button"
          className="min-w-32"
        >
          {isApplying ? applyLoadingText : applyLabel}
        </GeneralButton>
      ) : null}
    </div>
  );
}

function FilterContent({
  children,
  contentClassName,
  ...footer
}: FilterFooterProps & {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="border-t border-brand-navy/10 px-5 py-5">
      <div
        className={cn(
          "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
          contentClassName,
        )}
      >
        {children}
      </div>

      <FilterFooter {...footer} />
    </div>
  );
}

function useFilterExpansion(
  input: Pick<
    DataTableFilterProps,
    "collapsible" | "defaultExpanded" | "expanded" | "onExpandedChange"
  >,
) {
  const [internal, setInternal] = useState(input.defaultExpanded ?? false);

  const expanded = input.collapsible ? (input.expanded ?? internal) : true;

  const toggle = () => {
    const next = !expanded;

    if (input.expanded === undefined) {
      setInternal(next);
    }

    input.onExpandedChange?.(next);
  };

  return [expanded, toggle] as const;
}

export function DataTableFilter({
  applyLabel = "Apply filters",
  applyLoadingText = "Applying…",
  children,
  className,
  clearLabel = "Clear filters",
  collapsible = true,
  contentClassName,
  defaultExpanded = false,
  description,
  expanded,
  footerActions,
  headerActions,
  isApplyDisabled = false,
  isApplying = false,
  isClearDisabled = false,
  onApply,
  onClear,
  onExpandedChange,
  title,
}: DataTableFilterProps) {
  const [isExpanded, toggle] = useFilterExpansion({
    collapsible,
    defaultExpanded,
    expanded,
    onExpandedChange,
  });

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm",
        className,
      )}
    >
      <FilterHeader
        clearLabel={clearLabel}
        collapsible={collapsible}
        description={description}
        expanded={isExpanded}
        headerActions={headerActions}
        isApplying={isApplying}
        isClearDisabled={isClearDisabled}
        onClear={isExpanded ? undefined : onClear}
        onToggle={toggle}
        title={title}
      />

      {isExpanded ? (
        <FilterContent
          applyLabel={applyLabel}
          applyLoadingText={applyLoadingText}
          clearLabel={clearLabel}
          contentClassName={contentClassName}
          footerActions={footerActions}
          isApplyDisabled={isApplyDisabled}
          isApplying={isApplying}
          isClearDisabled={isClearDisabled}
          onApply={onApply}
          onClear={onClear}
        >
          {children}
        </FilterContent>
      ) : null}
    </section>
  );
}