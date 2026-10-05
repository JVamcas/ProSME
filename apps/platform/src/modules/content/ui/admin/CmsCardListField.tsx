"use client";

import { ArrayField, useRowLabel } from "@payloadcms/ui";
import type { ArrayFieldClientProps } from "payload";

const grid = String.raw`[&_.array-field\_\_draggable-rows]:grid [&_.array-field\_\_draggable-rows]:grid-cols-1 [&_.array-field\_\_draggable-rows]:items-start [&_.array-field\_\_draggable-rows]:gap-4 md:[&_.array-field\_\_draggable-rows]:grid-cols-2 xl:[&_.array-field\_\_draggable-rows]:grid-cols-3 [&_.collapsible]:min-w-0 [&_.collapsible]:rounded-xl [&_.collapsible]:border-brand-navy/15`;

export function CmsCardListField(props: ArrayFieldClientProps) {
  return (
    <div className={grid}>
      <ArrayField {...props} />
    </div>
  );
}

export function CmsCardListRowLabel() {
  const { data, rowNumber } = useRowLabel<{ title?: string; label?: string }>();
  const title = data?.title || data?.label;
  return (
    <span className="font-semibold text-brand-navy">
      {title || `Item ${(rowNumber ?? 0) + 1}`}
    </span>
  );
}
