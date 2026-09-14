import type { LucideIcon } from "lucide-react";
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
    <article className="h-full rounded-2xl border border-brand-orange/15 bg-brand-white p-4 shadow-sm transition hover:border-brand-orange/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue/20">
          <Icon aria-hidden="true" className="size-5 text-brand-orange" />
        </span>
        <div>
          <strong className="block text-2xl leading-none text-brand-navy">
            {value}
          </strong>
          <p className="mt-1 text-sm font-bold text-brand-navy">{label}</p>
          <p className="mt-0.5 text-xs text-brand-navy/65">{supportingText}</p>
        </div>
      </div>
    </article>
  );

  if (!href) return content;
  return (
    <Link
      aria-label={`${label}: ${value}. ${supportingText}`}
      className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
      href={href}
    >
      {content}
    </Link>
  );
}
