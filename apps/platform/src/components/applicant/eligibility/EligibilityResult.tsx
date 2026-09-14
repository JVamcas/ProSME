import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { EligibilityAssessmentView } from "@/modules/eligibility/EligibilityTypes";

const resultContent = {
  "action-required": {
    description: "You meet the core requirements, but should resolve the items below before submitting a complete application.",
    title: "A few actions are required",
  },
  "likely-eligible": {
    description: "Based on your responses, you meet the initial requirements. Final eligibility is subject to document verification and assessment.",
    title: "You appear eligible to apply",
  },
  "not-currently-eligible": {
    description: "One or more core programme requirements are not currently met. Review the items below before proceeding.",
    title: "You are not currently eligible",
  },
};

export function EligibilityResult({
  assessment,
  onRestart,
}: {
  assessment: EligibilityAssessmentView;
  onRestart: () => void;
}) {
  const eligible = assessment.outcome === "likely-eligible";
  const content = resultContent[assessment.outcome];
  const failedRules = assessment.rules.filter(
    (rule) => assessment.answers[rule.id] === "no",
  );
  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm">
      <div className={eligible ? "bg-brand-green/10 p-7 sm:p-9" : "bg-brand-cream p-7 sm:p-9"}>
        {eligible ? (
          <CheckCircle2 className="size-10 text-brand-green" aria-hidden="true" />
        ) : (
          <AlertCircle className="size-10 text-brand-orange" aria-hidden="true" />
        )}
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-brand-orange">
          Your result
        </p>
        <h2 className="display mt-2 text-3xl font-bold text-brand-navy">
          {content.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-brand-navy/70">
          {content.description}
        </p>
      </div>
      {failedRules.length ? (
        <div className="border-t border-brand-navy/10 p-7 sm:p-9">
          <h3 className="font-bold text-brand-navy">Items to review</h3>
          <ul className="mt-4 grid gap-3">
            {failedRules.map((rule) => (
              <li className="rounded-xl bg-brand-cream/70 p-4" key={rule.id}>
                <p className="text-sm font-semibold text-brand-navy">
                  {rule.question}
                </p>
                <p className="mt-1 text-xs leading-5 text-brand-navy/65">
                  {rule.help}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-brand-navy/10 p-6 sm:flex-row sm:justify-between">
        <Button onClick={onRestart} type="button" variant="ghost">
          <RotateCcw className="size-4" />
          Check again
        </Button>
        {assessment.outcome !== "not-currently-eligible" ? (
          <Button asChild>
            <Link href={`/portal/applications/new?fundingOpportunityId=${assessment.fundingOpportunityId}`}>
              Start application
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

