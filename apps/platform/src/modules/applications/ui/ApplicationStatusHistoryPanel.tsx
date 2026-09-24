"use client";

import { GeneralButton } from "@/components/ui/button";
import { useOwnApplicationStatusHistory } from "../ApplicationHooks";
import type { ApplicationSummary } from "../ApplicationTypes";

export function ApplicationStatusHistoryPanel({
  application,
  onClose,
}: {
  application: ApplicationSummary;
  onClose: () => void;
}) {
  const history = useOwnApplicationStatusHistory(application.id);
  return (
    <section className="rounded-xl border border-brand-navy/15 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-brand-navy">Status history</h2>
        <GeneralButton size="compact" onClick={onClose} type="button">
          Close
        </GeneralButton>
      </div>
      {history.isPending ? <p>Loading status history…</p> : null}
      {history.isError ? <p role="alert">{history.error.message}</p> : null}
      {history.data ? (
        <ol className="mt-3 space-y-3">
          {history.data.pages
            .flatMap((page) => page.items)
            .map((item) => (
              <li key={`${item.occurredAt}-${item.publicStatus.status}`}>
                <p className="font-medium">{item.publicStatus.label}</p>
                <p className="text-sm">{item.publicStatus.description}</p>
                <time className="text-xs" dateTime={item.occurredAt}>
                  {new Date(item.occurredAt).toLocaleString()}
                </time>
              </li>
            ))}
        </ol>
      ) : null}
      {history.hasNextPage ? (
        <GeneralButton
          className="mt-4 rounded-full border px-4 py-2"
          disabled={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
          size="compact"
        >
          {history.isFetchingNextPage ? "Loading…" : "Show earlier status"}
        </GeneralButton>
      ) : null}
    </section>
  );
}
