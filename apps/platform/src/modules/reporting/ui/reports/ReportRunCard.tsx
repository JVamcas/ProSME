import { FileText, Tag } from "lucide-react";
import { useId, type ReactNode } from "react";
import { formatLocalDateTimeSeconds24 } from "@/lib/dateUtils";
import { Badge } from "@/shared/ui/Badge";
import { cn } from "@/lib/utils";
import type { ReportRun, ReportRunEvent } from "../../domain/Report";
import { ReportRunParameters } from "./ReportRunParameters";
import {
  reportRunEventLabel,
  reportRunStatusPresentation,
} from "./ReportRunPresentation";

const eventDotClasses: Record<string, string> = {
  "reporting.generation.failed": "border-red-600 bg-red-600",
  "reporting.generation.completed": "border-brand-green bg-brand-green",
};

export function ReportRunCard({
  run,
  events,
  children,
}: {
  run: ReportRun;
  events: ReportRunEvent[];
  children?: ReactNode;
}) {
  const lifecycleId = useId();
  const status = reportRunStatusPresentation[run.status];
  const StatusIcon = status.icon;
  const failed = run.status === "FAILED";

  return (
    <div className="space-y-6 text-brand-navy">
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          failed
            ? "border-red-200 bg-red-50/80"
            : "border-brand-navy/10 bg-slate-50",
        )}
      >
        <StatusIcon
          aria-hidden="true"
          className={cn("mt-0.5 size-6 shrink-0", status.iconClassName)}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold">{status.label}</p>
            <Badge
              variant={failed ? "danger" : "outline"}
              className={cn(
                "rounded-md",
                failed
                  ? "bg-red-100 text-red-800"
                  : "border-transparent bg-white",
              )}
            >
              {status.badge}
            </Badge>
          </div>
          <p
            role={run.error ? "alert" : undefined}
            className="whitespace-pre-wrap break-words text-sm leading-6 text-brand-navy/70"
          >
            {run.error || status.description}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-[1fr_1fr_1.5fr]">
        <div className="space-y-1.5 pr-4">
          <dt className="text-sm text-brand-navy/60">Format</dt>
          <dd className="font-medium">{run.format}</dd>
        </div>
        <div className="space-y-1.5 border-l border-brand-navy/10 px-4">
          <dt className="text-sm text-brand-navy/60">Rows</dt>
          <dd className="font-medium">{run.rows?.toLocaleString() ?? "—"}</dd>
        </div>
        <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1 sm:border-l sm:border-brand-navy/10 sm:pl-4">
          <dt className="text-sm text-brand-navy/60">Timezone</dt>
          <dd className="break-words font-medium">{run.timezone}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-brand-navy/70">
        <span className="inline-flex items-center gap-2">
          <FileText aria-hidden="true" className="size-4" />
          Template v{run.templateVersion}
        </span>
        <span className="inline-flex items-center gap-2">
          <Tag aria-hidden="true" className="size-4" />
          Report v{run.reportVersion}
        </span>
      </div>
      {children}
      <section aria-labelledby={lifecycleId} className="space-y-4">
        <h3 id={lifecycleId} className="text-base font-semibold">
          Lifecycle
        </h3>
        {events.length ? (
          <ol>
            {events.map((event) => (
              <li
                key={event.key}
                className="relative ml-2 border-l border-brand-navy/15 pb-5 pl-6 last:border-transparent last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-2 top-1 size-4 rounded-full border-[3px] bg-white",
                    eventDotClasses[event.key] ?? "border-slate-500",
                  )}
                />
                <p className="text-sm font-medium">
                  {reportRunEventLabel(event.key)}
                </p>
                <time
                  dateTime={event.occurredAt}
                  className="mt-1 block text-xs text-brand-navy/60"
                >
                  {formatLocalDateTimeSeconds24(event.occurredAt)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-brand-navy/60">
            No lifecycle events recorded yet.
          </p>
        )}
      </section>
      <ReportRunParameters run={run} />
    </div>
  );
}
