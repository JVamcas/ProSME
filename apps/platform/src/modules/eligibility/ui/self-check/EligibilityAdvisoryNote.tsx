import { Info } from "lucide-react";

export function EligibilityAdvisoryNote() {
  return (
    <aside className="mt-6 flex items-start gap-3 rounded-xl border border-brand-blue/25 bg-brand-blue/5 p-4 sm:p-5">
      <Info aria-hidden className="mt-1 size-5 shrink-0 text-brand-navy" />
      <p className="text-sm leading-6 text-brand-navy/75">
        This self-check is guidance. Formal eligibility is verified during
        application review.
      </p>
    </aside>
  );
}
