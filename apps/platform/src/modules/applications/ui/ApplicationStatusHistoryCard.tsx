"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { useOwnApplicationStatusHistory } from "../ApplicationHooks";
import type { ApplicationSummary } from "../ApplicationTypes";

export function ApplicationStatusHistoryCard({
  application,
}: {
  application: ApplicationSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  const history = useOwnApplicationStatusHistory(application.id);
  const allItems = history.data?.pages.flatMap((page) => page.items) ?? [];
  const visibleItems = expanded ? allItems : allItems.slice(0, 2);

  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-navy">Status history</h2>
        {allItems.length > 2 || history.hasNextPage ? (
          <GeneralButton
            onClick={() => setExpanded((value) => !value)}
            size="compact"
            variant="ghost"
          >
            {expanded ? "Show less" : "View all"}
          </GeneralButton>
        ) : null}
      </div>
      {history.isPending ? (
        <p className="mt-4 text-sm text-brand-navy/65">Loading status history…</p>
      ) : null}
      {history.isError ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {history.error.message}
        </p>
      ) : null}
      {history.isSuccess && visibleItems.length === 0 ? (
        <p className="mt-4 text-sm text-brand-navy/65">
          {application.status === "draft"
            ? "Status history begins when you submit your application."
            : "No public status updates are available yet."}
        </p>
      ) : null}
      {visibleItems.length > 0 ? (
        <ol className="mt-5 border-l-2 border-brand-orange/30 pl-5">
          {visibleItems.map((item) => (
            <li
              className="relative pb-5 last:pb-0 before:absolute before:-left-[27px] before:top-1 before:size-3 before:rounded-full before:bg-brand-orange"
              key={`${item.occurredAt}-${item.publicStatus.status}`}
            >
              <strong className="block text-sm text-brand-navy">
                {item.publicStatus.label}
              </strong>
              <time
                className="mt-1 block text-xs text-brand-navy/60"
                dateTime={item.occurredAt}
              >
                {formatLocalDateTime24(item.occurredAt)}
              </time>
              <p className="mt-1 text-xs text-brand-navy/70">
                {item.publicStatus.description}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
      {expanded && history.hasNextPage ? (
        <GeneralButton
          className="mt-4"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
          size="sm"
          variant="outline"
        >
          {history.isFetchingNextPage ? "Loading…" : "Show earlier updates"}
        </GeneralButton>
      ) : null}
    </section>
  );
}
