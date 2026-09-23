"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { useApplicationReadiness } from "./useApplicationReadiness";

export function ApplicationReadinessPanel({ applicationId }: { applicationId: string }) {
  const readiness = useApplicationReadiness(applicationId);
  if (readiness.isPending) {
    return <p className="text-sm text-brand-navy/65">Calculating submission readiness…</p>;
  }
  if (readiness.isError || !readiness.data) {
    return <p className="text-sm text-red-700" role="alert">{readiness.error?.message}</p>;
  }
  return (
    <section aria-labelledby="readiness-heading" className="space-y-4 rounded-xl bg-brand-cream p-5">
      <div className="flex items-center gap-2">
        {readiness.data.ready ? (
          <CheckCircle2 aria-hidden="true" className="size-5 text-brand-green" />
        ) : (
          <AlertCircle aria-hidden="true" className="size-5 text-brand-orange" />
        )}
        <h2 className="text-lg font-bold text-brand-navy" id="readiness-heading">
          {readiness.data.ready ? "Ready to submit" : "Not ready to submit"}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {readiness.data.sections.map((section) => (
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
      {readiness.data.blockers.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-brand-navy/80">
          {readiness.data.blockers.map((blocker) => (
            <li key={`${blocker.code}:${blocker.sectionKey ?? blocker.requirementKey ?? "application"}`}>
              {blocker.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
