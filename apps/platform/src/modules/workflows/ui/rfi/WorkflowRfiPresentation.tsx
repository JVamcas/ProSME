import { Clock3, MessageSquareText } from "lucide-react";
import Link from "next/link";

import { GeneralButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type {
  WorkflowRfiCorrespondenceEntry,
  WorkflowRfiSummary,
} from "../../domain/runtime/WorkflowRfiView";
import { ArrowLink } from "@/components/ui/links";

export function WorkflowRfiDeadline({
  deadlineAt,
  isOverdue,
  status,
}: Pick<WorkflowRfiSummary, "deadlineAt" | "isOverdue" | "status">) {
  const overdue = status === "OPEN" && isOverdue;
  return (
    <p
      className={overdue ? "font-semibold text-red-700" : "text-brand-navy/65"}
    >
      <Clock3 aria-hidden="true" className="mr-1 inline size-4" />
      {overdue ? "Overdue since " : "Due "}
      {formatLocalDateTime24(deadlineAt)}
    </p>
  );
}

export function WorkflowRfiSummaryList({
  applicationId,
  requests,
}: {
  applicationId: string;
  requests: WorkflowRfiSummary[];
}) {
  if (!requests.length) {
    return (
      <p className="rounded-xl border border-brand-navy/10 bg-white p-5 text-sm text-brand-navy/60">
        No requests for information have been issued for this application.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <article
          className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm"
          key={request.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StatusBadge status={request.status} />
              <h3 className="mt-3 font-bold text-brand-navy">
                {request.question}
              </h3>
              <div className="mt-3 text-xs">
                <WorkflowRfiDeadline
                  deadlineAt={request.deadlineAt}
                  isOverdue={request.isOverdue}
                  status={request.status}
                />
              </div>
            </div>
            <GeneralButtonLink
              href={`/portal/applications/${applicationId}/requests/${request.id}`}
              size="compact"
              variant={request.status === "OPEN" ? "primary" : "outline"}
            >
              {request.status === "OPEN" ? "Respond now" : "View request"}
            </GeneralButtonLink>
          </div>
        </article>
      ))}
    </div>
  );
}

export function WorkflowRfiCorrespondence({
  entries,
}: {
  entries: WorkflowRfiCorrespondenceEntry[];
}) {
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-bold text-brand-navy">
        <MessageSquareText
          aria-hidden="true"
          className="size-5 text-brand-orange"
        />
        Correspondence
      </h2>
      {entries.length ? (
        <ol className="mt-4 space-y-3">
          {entries.map((entry) => (
            <li className="rounded-lg bg-brand-navy/4 p-4" key={entry.id}>
              <div className="flex flex-wrap justify-between gap-2 text-xs text-brand-navy/60">
                <span className="font-semibold text-brand-navy">
                  {entry.authorName}
                </span>
                <time>{formatLocalDateTime24(entry.createdAt)}</time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy/80">
                {entry.message}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-brand-navy/60">
          No correspondence has been recorded.
        </p>
      )}
    </section>
  );
}

export function StaffApplicationRfiTimeline({
  requests,
}: {
  requests: WorkflowRfiSummary[];
}) {
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-orange/10">
          <MessageSquareText
            aria-hidden="true"
            className="size-5 text-brand-orange"
          />
        </span>

        <div>
          <h2 className="font-bold text-brand-navy">
            Requests for information
          </h2>
          <p className="mt-1 text-sm text-brand-navy/60">
            Questions raised during the application review process.
          </p>
        </div>
      </div>

      {requests.length ? (
        <ol className="mt-5 space-y-3">
          {requests.map((request) => (
            <li
              className="rounded-xl border border-brand-navy/10 px-4 py-4"
              key={request.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold leading-6 text-brand-navy">
                    {request.question}
                  </p>

                  <p className="mt-1 text-xs text-brand-navy/55">
                    Created {formatLocalDateTime24(request.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={request.status} />
                  <ArrowLink href={`/admin/tasks/${request.taskId}`}>
                    Open task
                  </ArrowLink>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-brand-navy/15 px-4 py-6 text-center">
          <p className="text-sm text-brand-navy/60">
            No information requests have been issued.
          </p>
        </div>
      )}
    </section>
  );
}
