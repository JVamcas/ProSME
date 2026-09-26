import type { AuthoritativeEligibilityTaskResult } from "@/modules/work-queue/TaskTypes";

function outcomeLabel(evaluation: AuthoritativeEligibilityTaskResult) {
  if (evaluation.outcome === "INELIGIBLE") return "Ineligible";
  if (evaluation.manualScreeningRequired) return "Manual decision required";
  return "Eligible";
}

export function AuthoritativeEligibilityResult({
  evaluation,
}: {
  evaluation: AuthoritativeEligibilityTaskResult;
}) {
  return (
    <section
      aria-label="Eligibility evaluation result"
      className="rounded-xl border border-brand-navy/15 bg-brand-cream/40 p-5"
    >
      <h3 className="font-bold text-brand-navy">Eligibility result</h3>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
        <div>
          <dt className="text-brand-navy/55">Evaluation</dt>
          <dd className="font-semibold text-brand-navy">
            #{evaluation.evaluationNumber}
          </dd>
        </div>
        <div>
          <dt className="text-brand-navy/55">Outcome</dt>
          <dd className="font-semibold text-brand-navy">
            {outcomeLabel(evaluation)}
          </dd>
        </div>
        <div>
          <dt className="text-brand-navy/55">Hard failures</dt>
          <dd className="font-semibold text-brand-navy">
            {evaluation.hardFailureCount}
          </dd>
        </div>
        <div>
          <dt className="text-brand-navy/55">Soft failures</dt>
          <dd className="font-semibold text-brand-navy">
            {evaluation.softFailureCount}
          </dd>
        </div>
        <div>
          <dt className="text-brand-navy/55">Warnings</dt>
          <dd className="font-semibold text-brand-navy">
            {evaluation.warningCount}
          </dd>
        </div>
      </dl>
    </section>
  );
}
