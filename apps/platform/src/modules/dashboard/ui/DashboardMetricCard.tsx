import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type DashboardMetricCardProps = {
  icon: LucideIcon;
  href?: string;
  label: string;
  supportingText: string;
  value: string;
};

export function DashboardMetricCard({
  icon: Icon,
  href,
  label,
  supportingText,
  value,
}: DashboardMetricCardProps) {
  const content = (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange/50 hover:shadow-lg">
      <div className="pointer-events-none absolute -bottom-16 -right-16 size-40 rounded-full bg-brand-orange/8 transition-transform duration-300 group-hover:scale-125" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-orange/10 transition-all duration-300 group-hover:bg-brand-orange/15">
            <Icon
              aria-hidden="true"
              className="size-5 text-brand-orange transition-transform duration-300 group-hover:scale-110"
            />
          </span>

          {href && (
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-brand-orange shadow-sm transition-all duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange group-hover:text-white">
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </span>
          )}
        </div>

        <div className="mt-6">
          <strong className="block text-4xl font-bold leading-none tracking-tight text-brand-navy">
            {value}
          </strong>

          <p className="mt-3 text-base font-bold text-brand-navy">{label}</p>

          <p className="mt-1 text-sm leading-5 text-brand-navy/60">
            {supportingText}
          </p>
        </div>
      </div>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      aria-label={`${label}: ${value}. ${supportingText}`}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
      href={href}
    >
      {content}
    </Link>
  );
}