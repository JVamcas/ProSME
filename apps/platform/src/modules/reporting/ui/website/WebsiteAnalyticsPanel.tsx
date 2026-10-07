import type { ReactNode } from "react";
import { InfoTooltip } from "@/shared/ui/InfoTooltip";
import { cn } from "@/lib/utils";
import type { AnalyticsSourceResult } from "../../domain/WebsiteAnalyticsMetrics";

export function WebsiteAnalyticsPanelFrame({
  title,
  description,
  details,
  status,
  children,
  contentHeight,
  headingLevel = 2,
}: {
  title: string;
  description?: string;
  details: ReactNode;
  status?: string;
  children: ReactNode;
  contentHeight?: number;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <section className="min-w-0 rounded-xl border border-brand-blue/25 bg-brand-white p-4 shadow-sm">
      <div
        className={cn(
          "mb-3 flex items-start justify-between gap-2",
          contentHeight !== undefined ? "h-[72px]" : "min-h-6",
        )}
      >
        <div className="min-w-0">
          <Heading className="line-clamp-2 text-base font-bold text-brand-navy">
            {title}
          </Heading>
          {description ? (
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status ? (
            <span role="status" className="text-xs text-slate-500">
              {status}
            </span>
          ) : null}
          <InfoTooltip content={details} />
        </div>
      </div>
      <div
        className={cn("min-w-0", contentHeight !== undefined && "overflow-auto")}
        style={{ height: contentHeight }}
      >
        {children}
      </div>
    </section>
  );
}

export function WebsiteAnalyticsPanel<T>({
  title,
  scope,
  result,
  children,
  headingLevel = 2,
  contentHeight,
  description,
}: {
  title: string;
  scope: string;
  result: AnalyticsSourceResult<T>;
  children: (data: T) => ReactNode;
  headingLevel?: 2 | 3;
  contentHeight?: number;
  description?: string;
}) {
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
    <WebsiteAnalyticsPanelFrame
      title={title}
      description={description}
      details={details}
      contentHeight={contentHeight}
      headingLevel={headingLevel}
      status={
        result.state === "no-data"
          ? "No data"
          : result.state === "stale"
            ? "Last saved"
            : undefined
      }
    >
      <span className="sr-only">{scope}</span>
      {usable ? (
        children(result.data!)
      ) : (
        <p role="status" className="py-6 text-sm text-brand-navy/70">
          {result.note ?? "Data unavailable."}
        </p>
      )}
    </WebsiteAnalyticsPanelFrame>
  );
}
