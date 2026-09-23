import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/Badge";

export const statusStyles: Record<string, string> = {
  approved: "bg-brand-green/15 text-brand-navy",
  active: "bg-brand-green/15 text-brand-green",
  closed: "border border-brand-navy bg-brand-cream text-brand-navy",
  "completeness check": "bg-brand-gold/40 text-brand-navy",
  declined: "border border-brand-navy bg-brand-cream text-brand-navy",
  draft: "bg-brand-cream text-brand-navy",
  "finance review": "bg-brand-blue/20 text-brand-navy",
  invited: "bg-brand-gold/30 text-brand-navy",
  "more information": "bg-brand-gold/40 text-brand-navy",
  open: "bg-brand-green/40 text-brand-navy",
  published: "bg-brand-green/15 text-brand-navy",
  retired: "border border-brand-navy bg-brand-cream text-brand-navy",
  suspended: "bg-brand-gold/30 text-brand-navy",
  disabled: "bg-brand-navy/10 text-brand-navy/60",
  submitted: "bg-brand-blue/40 text-brand-navy",
  "technical assessment": "bg-brand-blue/40 text-brand-navy",
  upcoming: "bg-brand-yellow text-brand-navy",
  live:"bg-brand-green/40 text-brand-white"
};

type StatusBadgeProps = {
  className?: string;
  label?: string;
  status: string;
};

function defaultLabel(status: string) {
  return status
    .trim()
    .toLocaleLowerCase()
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function StatusBadge({ className, label, status }: StatusBadgeProps) {
  const style =
    statusStyles[status.toLocaleLowerCase()] ??
    "bg-brand-cream text-brand-navy";

  return (
    <Badge className={cn(style, className)}>
      {label ?? defaultLabel(status)}
    </Badge>
  );
}
