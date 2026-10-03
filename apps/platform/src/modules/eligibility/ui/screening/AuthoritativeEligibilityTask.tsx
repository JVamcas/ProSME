"use client";

import { useRouter } from "next/navigation";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { useEligibilityTerminationConfirmation } from "@/modules/eligibility/ui/screening/useEligibilityTerminationConfirmation";
import { AuthoritativeEligibilityResult } from "./AuthoritativeEligibilityResult";

export function AuthoritativeEligibilityTask({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const evaluation = useEligibilityTerminationConfirmation(task.taskInstanceId);
  const current = task.eligibilityEvaluation;
  async function run() {
    try {
      const result = await evaluation.mutateAsync({
        expectedRowVersion: task.rowVersion,
      });
      if (!result) return;
      toast.success(
        result.terminalStatus
          ? "Application terminated after a hard eligibility failure."
          : "Authoritative eligibility evaluation completed.",
      );
      if (result.terminalStatus) router.push("/admin/work-queue");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Eligibility evaluation failed.",
      );
    }
  }
  return (
    <>
      {evaluation.confirmationDialog}
      <section className="rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-brand-orange" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-brand-navy">
              Verified eligibility screening
            </h2>
            <p className="mt-1 text-sm leading-6 text-brand-navy/65">
              Run the bound Ruleset Version against completed Screening
              evidence.
            </p>
            {current ? (
              <div className="mt-4">
                <AuthoritativeEligibilityResult evaluation={current} />
              </div>
            ) : null}
          </div>
        </div>
        {evaluation.error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {evaluation.error.message}
          </p>
        ) : null}
        {!task.formVersionId ? (
          <div className="mt-5 flex justify-end border-t border-brand-navy/10 pt-4">
            <GeneralButton
              disabled={evaluation.isPending}
              onClick={() => void run()}
              type="button"
            >
              {evaluation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : null}
              {current
                ? "Re-evaluate eligibility"
                : "Run eligibility evaluation"}
            </GeneralButton>
          </div>
        ) : null}
      </section>
    </>
  );
}
