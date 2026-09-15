"use client";

import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-navy/70">
          <SlidersHorizontal aria-hidden="true" className="size-3.5" />
          {title}
        </div>
        {description ? (
          <p className="text-sm text-brand-navy/65">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {headerActions}
        {collapsible ? (
          <GeneralButton
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
            onClick={onToggle}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Chevron aria-hidden="true" className="size-4" />
            {expanded ? "Hide filters" : "Show filters"}
          </GeneralButton>
        ) : null}
        {onClear ? (
          <GeneralButton
            disabled={!expanded || isClearDisabled || isApplying}
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
  | "onApply"
>;

function FilterFooter({
  applyLabel,
  applyLoadingText,
  footerActions,
  isApplyDisabled,
  isApplying,
  onApply,
}: FilterFooterProps) {
  if (!footerActions && !onApply) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
      {footerActions}
      {onApply ? (
        <GeneralButton
          aria-busy={isApplying}
          disabled={isApplyDisabled || isApplying}
          onClick={onApply}
          type="button"
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
    <>
      <div className={cn("mt-4", contentClassName)}>{children}</div>
      <FilterFooter {...footer} />
    </>
  );
}

function useFilterExpansion(input: Pick<
  DataTableFilterProps,
  "collapsible" | "defaultExpanded" | "expanded" | "onExpandedChange"
>) {
  const [internal, setInternal] = useState(input.defaultExpanded ?? false);
  const expanded = input.collapsible ? (input.expanded ?? internal) : true;
  const toggle = () => {
    const next = !expanded;
    if (input.expanded === undefined) setInternal(next);
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
  const expansion = { collapsible, defaultExpanded, expanded, onExpandedChange };
  const [isExpanded, toggle] = useFilterExpansion(expansion);
  return (
    <section
      className={cn(
        "rounded-2xl border border-brand-navy/10 bg-brand-navy/[0.025] p-4 sm:p-5",
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
        onClear={onClear}
        onToggle={toggle}
        title={title}
      />
      {isExpanded ? (
        <FilterContent
          applyLabel={applyLabel}
          applyLoadingText={applyLoadingText}
          contentClassName={contentClassName}
          footerActions={footerActions}
          isApplyDisabled={isApplyDisabled}
          isApplying={isApplying}
          onApply={onApply}
        >
          {children}
        </FilterContent>
      ) : null}
    </section>
  );
}
