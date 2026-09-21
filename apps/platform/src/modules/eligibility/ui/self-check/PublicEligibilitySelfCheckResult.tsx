import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";
import type { PublicEligibilitySelfCheckResult as Result } from "../../api/PublicEligibilitySelfCheckTransport";

const outcomeContent = {
  "likely-eligible": {
    description:
      "Your answers indicate that you may meet the initial eligibility requirements.",
    title: "You appear eligible to apply",
  },
  "not-currently-eligible": {
    description:
      "One or more essential requirements are not currently met.",
    title: "You may not currently be eligible",
  },
  "review-required": {
    description:
      "Your answers need clarification or attention during formal screening.",
    title: "Further review may be required",
  },
};

const severityLabels = {
  blocking: "Requirement not met",
  review: "Requires review",
  warning: "Please note",
};

export function PublicEligibilitySelfCheckResult({
  onRestart,
  result,
}: {
  onRestart: () => void;
  result: Result;
}) {
  const content = outcomeContent[result.outcome];
  const positive = result.outcome === "likely-eligible";
  return (
    <section className="overflow-hidden rounded-2xl border border-brand-navy/15 bg-white shadow-sm">
      <div className={positive ? "bg-emerald-50 p-7" : "bg-amber-50 p-7"}>
        {positive ? (
          <CheckCircle2 className="size-10 text-brand-green" aria-hidden />
        ) : (
          <AlertCircle className="size-10 text-brand-orange" aria-hidden />
        )}
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand-orange">
          Advisory result
        </p>
        <h2 className="display mt-2 text-3xl font-bold text-brand-navy">
          {content.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-brand-navy/70">
          {content.description}
        </p>
      </div>
      {result.guidance.length ? (
        <div className="border-t border-brand-navy/10 p-7">
          <h3 className="font-bold text-brand-navy">Guidance</h3>
          <ul className="mt-4 grid gap-3">
            {result.guidance.map((item, index) => (
              <li className="rounded-xl bg-brand-cream/70 p-4" key={index}>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-orange">
                  {severityLabels[item.severity]}
                </p>
                <p className="mt-1 text-sm leading-6 text-brand-navy">
                  {item.message}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="border-t border-brand-navy/10 p-6">
        <p className="text-sm leading-6 text-brand-navy/70">
          {result.disclaimer}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <GeneralButton onClick={onRestart} variant="ghost">
            <RotateCcw className="size-4" aria-hidden />
            Check again
          </GeneralButton>
          {result.applicationsOpen && result.outcome !== "not-currently-eligible" ? (
            <GeneralButton asChild>
              <Link href={`/portal/applications/new?fundingOpportunityId=${result.fundingCallId}`}>
                Start application
              </Link>
            </GeneralButton>
          ) : null}
        </div>
      </div>
    </section>
  );
}
