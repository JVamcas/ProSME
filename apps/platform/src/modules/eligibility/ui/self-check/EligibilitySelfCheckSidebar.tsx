import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function EligibilitySelfCheckSidebar({
  description,
  note,
}: {
  description: ReactNode;
  note?: ReactNode;
}) {
  return (
    <aside>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-orange">
        Before you apply
      </p>
      <h2 className="display mt-4 text-4xl font-bold leading-[1.05] text-brand-navy sm:text-5xl">
        Check your eligibility
      </h2>
      <div className="mt-7 text-base leading-7 text-brand-navy/80">
        {description}
      </div>
      <div className="mt-8 flex gap-4 rounded-2xl border border-brand-orange/40 bg-brand-orange/[0.07] p-6">
        <ShieldCheck
          className="mt-0.5 size-7 shrink-0 text-brand-navy"
          aria-hidden
        />
        <div>
          <strong className="block text-sm text-brand-navy">
            Private and indicative
          </strong>
          <p className="mt-1 text-sm leading-6 text-brand-navy/75">
            No information is submitted. Final eligibility is confirmed during
            formal screening.
          </p>
        </div>
      </div>
      {note ? (
        <div className="mt-7 text-sm leading-6 text-brand-navy/45">{note}</div>
      ) : null}
    </aside>
  );
}
