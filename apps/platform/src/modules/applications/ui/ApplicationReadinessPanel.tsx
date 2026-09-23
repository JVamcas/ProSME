"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { toast } from "@/shared/ui/Toast";
import { useSubmitApplication } from "../ApplicationHooks";
import {
  useApplicationPreflight,
  useApplicationReadiness,
} from "./useApplicationReadiness";

export function ApplicationReadinessPanel({
  applicationId,
}: {
  applicationId: string;
}) {
  const readiness = useApplicationReadiness(applicationId);
  const preflight = useApplicationPreflight(applicationId);
  const submission = useSubmitApplication(applicationId);
  const result = preflight.data ?? readiness.data;

  if (readiness.isPending) {
    return (
      <p className="text-sm text-brand-navy/65">
        Calculating submission readiness…
      </p>
    );
  }
  if (readiness.isError || !result) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {readiness.error?.message}
      </p>
    );
  }

  async function confirmSubmission() {
    if (!preflight.data?.ready || !preflight.data.readinessToken) return;
    const confirmed = window.confirm(
      "Submit this application? You will not be able to edit the lodged application.",
    );
    if (!confirmed) return;
    submission.mutate({
      expectedApplicationRowVersion:
        preflight.data.applicationRowVersion,
      finalConfirmation: true,
      readinessToken: preflight.data.readinessToken,
    }, {
      onError: (error) => {
        toast.error("Application was not submitted", {
          description: error.message,
        });
      },
      onSuccess: (submitted) => {
        toast.success("Application submitted", {
          description: `Reference ${submitted.reference}`,
        });
      },
    });
  }

  return (
    <section
      aria-labelledby="readiness-heading"
      className="space-y-4 rounded-xl bg-brand-cream p-5"
    >
      <div className="flex items-center gap-2">
        {result.ready ? (
          <CheckCircle2 aria-hidden="true" className="size-5 text-brand-green" />
        ) : (
          <AlertCircle aria-hidden="true" className="size-5 text-brand-orange" />
        )}
        <h2 className="text-lg font-bold text-brand-navy" id="readiness-heading">
          {result.ready ? "Ready to submit" : "Not ready to submit"}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {result.sections.map((section) => (
          <div className="rounded-lg bg-white p-3" key={section.key}>
            <div className="flex justify-between gap-3 text-sm font-semibold text-brand-navy">
              <span>{section.title}</span>
              <span>{section.percent}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-navy/10">
              <div
                aria-label={`${section.title}: ${section.percent}% complete`}
                className="h-full rounded-full bg-brand-green"
                role="progressbar"
                style={{ width: `${section.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {result.blockers.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-brand-navy/80">
          {result.blockers.map((item) => (
            <li
              key={`${item.code}:${item.sectionKey ?? item.requirementKey ?? "application"}`}
            >
              {item.message}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <GeneralButton
          disabled={preflight.isPending || submission.isPending}
          onClick={() => preflight.mutate()}
          variant="outline"
        >
          {preflight.isPending ? "Checking…" : "Run submission preflight"}
        </GeneralButton>
        {preflight.data?.ready && preflight.data.readinessToken ? (
          <GeneralButton
            disabled={submission.isPending}
            onClick={() => void confirmSubmission()}
          >
            {submission.isPending ? "Submitting…" : "Confirm and submit"}
          </GeneralButton>
        ) : null}
      </div>
      {preflight.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {preflight.error.message}
        </p>
      ) : null}
    </section>
  );
}
