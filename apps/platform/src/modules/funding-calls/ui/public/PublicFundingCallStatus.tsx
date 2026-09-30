import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { PublicFundingCallSummary } from "../../api/PublicFundingCallTransport";

const labels = {
  open: "Applications open",
  upcoming: "Opening soon",
  closed: "Applications closed",
};

export function PublicFundingCallStatus({
  call,
  className,
}: {
  call: Pick<PublicFundingCallSummary, "status">;
  className?: string;
}) {
  return (
    <StatusBadge
      className={cn(
        "gap-2 px-3 py-1.5 text-xs text-brand-navy before:size-2 before:rounded-full before:bg-current",
        call.status === "open" ? "bg-brand-green/15" : "bg-brand-cream",
        className,
      )}
      label={labels[call.status]}
      status={call.status}
    />
  );
}
