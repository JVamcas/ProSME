"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { useEvaluateAuthoritativeEligibility } from "@/modules/work-queue/WorkQueueHooks";

function outcomeLabel(task: TaskDetail) {
  const evaluation = task.eligibilityEvaluation;
  if (!evaluation) return null;
  if (evaluation.outcome === "INELIGIBLE") return "Ineligible";
  if (evaluation.manualScreeningRequired) return "Manual decision required";
  return "Eligible";
}

export function AuthoritativeEligibilityTask({ task }: { task: TaskDetail }) {
  const evaluation = useEvaluateAuthoritativeEligibility(task.taskInstanceId);
  const current = task.eligibilityEvaluation;
  async function run() {
    try {
      await evaluation.mutateAsync(task.rowVersion);
      toast.success("Authoritative eligibility evaluation completed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Eligibility evaluation failed.",
      );
    }
  }
  return (
    <section className="rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-orange" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-brand-navy">
            Verified eligibility screening
          </h2>
          <p className="mt-1 text-sm leading-6 text-brand-navy/65">
            Run the bound Ruleset Version against completed Screening evidence.
          </p>
          {current ? (
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-brand-navy/55">Evaluation</dt>
                <dd className="font-semibold text-brand-navy">
                  #{current.evaluationNumber}
                </dd>
              </div>
              <div>
                <dt className="text-brand-navy/55">Outcome</dt>
                <dd className="font-semibold text-brand-navy">
                  {outcomeLabel(task)}
                </dd>
              </div>
              <div>
                <dt className="text-brand-navy/55">Hard failures</dt>
                <dd className="font-semibold text-brand-navy">
                  {current.hardFailureCount}
                </dd>
              </div>
              <div>
                <dt className="text-brand-navy/55">Warnings</dt>
                <dd className="font-semibold text-brand-navy">
                  {current.warningCount}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
      {evaluation.error ? (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {evaluation.error.message}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end border-t border-brand-navy/10 pt-4">
        <GeneralButton
          disabled={evaluation.isPending}
          onClick={() => void run()}
          type="button"
        >
          {evaluation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : null}
          {current ? "Re-evaluate eligibility" : "Run eligibility evaluation"}
        </GeneralButton>
      </div>
    </section>
  );
}
