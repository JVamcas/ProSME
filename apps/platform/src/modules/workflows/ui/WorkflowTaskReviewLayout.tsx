"use client";

import type { ReactNode } from "react";

export function WorkflowTaskReviewSummary({
  completedCount,
  message,
  status,
  totalCount,
}: {
  completedCount: number;
  message: string;
  status: string;
  totalCount: number;
}) {
  const maximum = Math.max(totalCount, 1);
  const percentage = Math.round((completedCount / maximum) * 100);

  return (
    <section className="rounded-2xl border border-brand-orange/20 bg-brand-cream p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-brand-navy">Task completion</h2>
          <p className="mt-1 text-sm text-brand-navy/65">
            {message}
          </p>
        </div>
        <span className="text-sm font-semibold text-brand-navy">{status}</span>
      </div>
      <div
        aria-label={`Task completion: ${percentage} percent`}
        className="mt-4 h-2 overflow-hidden rounded-full bg-brand-white"
        role="progressbar"
        aria-valuemax={maximum}
        aria-valuemin={0}
        aria-valuenow={completedCount}
      >
        <div
          className="h-full bg-brand-orange"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
}

export function WorkflowTaskReviewLayout({
  actions,
  children,
  description,
  sectionCount,
  stageName,
  summary,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string | null;
  sectionCount: number;
  stageName: string;
  summary?: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-brand-navy">
          {stageName}
        </p>
        {description ? (
          <p className="mt-1 text-sm text-brand-navy/70">{description}</p>
        ) : null}
      </div>
      {summary}
      <div className="space-y-3">
        {children}
        {!sectionCount ? (
          <p className="rounded-xl bg-brand-cream p-4 text-sm text-brand-navy/70">
            No reviewer work sections are configured for this task.
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}
