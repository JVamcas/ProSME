import type { LucideIcon } from "lucide-react";

type DashboardMetricCardProps = {
  icon: LucideIcon;
  label: string;
  supportingText: string;
  value: string;
};

export function DashboardMetricCard({
  icon: Icon,
  label,
  supportingText,
  value,
}: DashboardMetricCardProps) {
  return (
    <article className="rounded-2xl border border-brand-orange/15 bg-brand-white p-4 shadow-sm">
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
}
