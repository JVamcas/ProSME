import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  approved: "bg-brand-green/15 text-brand-navy",
  closed: "border border-red-500 bg-red-500 text-white",
  "completeness check": "bg-brand-gold/40 text-brand-navy",
  declined: "border border-brand-navy bg-brand-cream text-brand-navy",
  draft: "bg-brand-cream text-brand-navy",
  "finance review": "bg-brand-blue/40 text-brand-navy",
  "more information": "bg-brand-gold/40 text-brand-navy",
  open: "bg-brand-green/40 text-brand-white",
  submitted: "bg-brand-blue/40 text-brand-navy",
  "technical assessment": "bg-brand-blue/40 text-brand-navy",
  upcoming: "bg-brand-yellow text-white",
};

type StatusBadgeProps = {
  className?: string;
  label?: string;
  status: string;
};

function defaultLabel(status: string) {
  return status.length
    ? `${status.charAt(0).toLocaleUpperCase()}${status.slice(1)}`
    : status;
}

export function StatusBadge({
  className,
  label,
  status,
}: StatusBadgeProps) {
  const style =
    statusStyles[status.toLocaleLowerCase()] ??
    "bg-brand-cream text-brand-navy";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold",
        style,
        className,
      )}
    >
      {label ?? defaultLabel(status)}
    </span>
  );
}
