"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { WorkflowTaskReviewSummary } from "@/modules/workflows/ui/WorkflowTaskReviewLayout";

export function WorkflowTaskPreviewSummary({
  requiredCount,
  sectionCount,
}: {
  requiredCount: number;
  sectionCount: number;
}) {
  return (
    <WorkflowTaskReviewSummary
      completedCount={0}
      message={requiredCount
        ? `0 of ${requiredCount} required items complete`
        : `${sectionCount} configured sections`}
      status="Not started"
      totalCount={requiredCount}
    />
  );
}

export function WorkflowTaskPreviewSection({
  children,
  defaultOpen = false,
  status,
  title,
}: {
  children?: ReactNode;
  defaultOpen?: boolean;
  status: string;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-brand-navy">
        <span className="font-bold">{title}</span>
        <span className="flex items-center gap-3 text-sm text-brand-navy/60">
          {status}
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-brand-navy/10 p-5">{children}</div>
    </details>
  );
}
