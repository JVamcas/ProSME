import { CircleAlert } from "lucide-react";

import { GeneralButtonLink } from "@/components/ui/button";
import type { WorkflowRfiSummary } from "../../domain/runtime/WorkflowRfiView";
import { WorkflowRfiDeadline } from "./WorkflowRfiPresentation";

export function ApplicantRfiActionPanel({
  requests,
}: {
  requests: WorkflowRfiSummary[];
}) {
  if (!requests.length) return null;
  return (
    <section
      aria-labelledby="information-requests-heading"
      className="mt-6 rounded-2xl border border-brand-orange/35 bg-brand-cream p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white">
          <CircleAlert aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2
            className="text-lg font-bold text-brand-navy"
            id="information-requests-heading"
          >
            Action required
          </h2>
          <p className="mt-1 text-sm text-brand-navy/70">
            Respond to these requests to keep your applications moving.
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <article
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4"
            key={request.id}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
                {request.applicationReference}
              </p>
              <h3 className="mt-1 font-bold text-brand-navy">
                {request.applicationTitle}
              </h3>
              <p className="mt-1 text-sm text-brand-navy/70">
                {request.question}
              </p>
              <div className="mt-2 text-xs">
                <WorkflowRfiDeadline
                  deadlineAt={request.deadlineAt}
                  isOverdue={request.isOverdue}
                  status={request.status}
                />
              </div>
            </div>
            <GeneralButtonLink
              href={`/portal/applications/${request.applicationId}/requests/${request.id}`}
            >
              Respond now
            </GeneralButtonLink>
          </article>
        ))}
      </div>
    </section>
  );
}
