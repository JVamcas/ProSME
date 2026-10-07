import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

type MetricSummaryProps = {
  icon: LucideIcon;
  iconTone?: "blue" | "green" | "orange" | "violet";
  change?: number | null;
  statusText?: string;
  title?: string;
  label: string;
  value: string;
  supportingText: string;
};

const iconToneClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-500",
  violet: "bg-violet-50 text-violet-600",
};

export function DashboardMetricSummary({
  icon: Icon,
  iconTone = "blue",
  change,
  statusText,
  title,
  label,
  value,
  supportingText,
}: MetricSummaryProps) {
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const ChangeIcon = isNegative ? ArrowDown : ArrowUp;

  const changeValue =
    change == null
      ? null
      : new Intl.NumberFormat("en-NA", {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "never",
        }).format(Math.abs(change));

  return (
    <article
      // title={title}
      className="group relative flex h-full min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-600">
            {label}
          </p>

          <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight text-brand-navy">
            {value}
          </p>
        </div>

        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full",
            iconToneClasses[iconTone],
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>

      <div className="mt-4">
        {change != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold",
              isPositive && "bg-emerald-50 text-emerald-700",
              isNegative && "bg-red-50 text-red-600",
              !isPositive &&
                !isNegative &&
                "bg-slate-50 text-slate-600",
            )}
          >
            <ChangeIcon aria-hidden="true" className="size-3.5" />
            {isPositive ? "+" : isNegative ? "-" : ""}
            {changeValue}
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-600">
            --
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-brand-blue"
          />
          <span className="line-clamp-1">{supportingText}</span>
        </p>
      </div>

      {statusText ? <p className="sr-only">{statusText}</p> : null}
    </article>
  );
}