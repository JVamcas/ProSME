import type { ApplicationStatus } from "@/data/admin-applications";
import { cn } from "@/lib/utils";

const styles: Record<ApplicationStatus, string> = {
  Submitted: "bg-orange-pale text-navy",
  "Completeness Check": "bg-amber-100 text-amber-800",
  "Technical Assessment": "bg-violet-100 text-violet-700",
  "Finance Review": "bg-blue-100 text-blue-700",
  "More Information": "bg-orange/10 text-orange",
  Approved: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold", styles[status])}>{status}</span>;
}
