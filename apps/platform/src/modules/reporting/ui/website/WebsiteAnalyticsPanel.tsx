import type { ReactNode } from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import type { AnalyticsSourceResult } from "../../domain/WebsiteAnalyticsMetrics";

export function WebsiteAnalyticsPanel<T>({
  title,
  scope,
  result,
  children,
  headingLevel = 2,
}: {
  title: string;
  scope: string;
  result: AnalyticsSourceResult<T>;
  children: (data: T) => ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const usable =
    result.data !== null &&
    ["ready", "stale", "no-data"].includes(result.state);
  const details = (
    <div className="space-y-1">
      <p>{scope}</p>
      {result.note ? <p>{result.note}</p> : null}
      {result.fetchedAt ? <p>Source refreshed: {result.fetchedAt}</p> : null}
      {result.metadata?.subjectToThresholding ? (
        <p>GA thresholding limits these results.</p>
      ) : null}
      {result.metadata?.sampled ? <p>GA returned sampled results.</p> : null}
      {result.metadata?.dataLossFromOtherRow ? (
        <p>GA grouped some data into an “other” row.</p>
      ) : null}
    </div>
  );
  return (
    <section className="min-w-0 rounded-xl border border-brand-blue/25 bg-brand-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Heading className="text-lg font-bold text-brand-navy">{title}</Heading>
        <div className="flex shrink-0 items-center gap-2">
          {result.state === "no-data" || result.state === "stale" ? (
            <span role="status" className="text-xs text-slate-500">
              {result.state === "no-data" ? "No data" : "Last saved"}
            </span>
          ) : null}
          <InfoTooltip content={details} />
        </div>
      </div>
      <span className="sr-only">{scope}</span>
      {usable ? (
        children(result.data!)
      ) : (
        <p role="status" className="py-6 text-sm text-brand-navy/70">
          {result.note ?? "Data unavailable."}
        </p>
      )}
    </section>
  );
}
