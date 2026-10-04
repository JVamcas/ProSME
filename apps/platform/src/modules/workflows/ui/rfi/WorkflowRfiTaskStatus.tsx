"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowRfiSummary } from "../../domain/runtime/WorkflowRfiView";
import { WorkflowRfiDeadline } from "./WorkflowRfiPresentation";

export type WorkflowRfiTaskStatusValue = Pick<
  WorkflowRfiSummary,
  "status" | "createdAt" | "deadlineAt" | "respondedAt"
>;

export function WorkflowRfiTaskStatus({
  request,
}: {
  request: WorkflowRfiTaskStatusValue;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (request.status !== "OPEN") return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [request.status]);
  const overdue =
    request.status === "OPEN" &&
    new Date(request.deadlineAt).getTime() <= now;
  const labels = {
    OPEN: "Information requested",
    RESPONDED: "Information request responded",
    CLOSED: "Information request closed",
    EXPIRED: "Information request expired",
  };
  let badgeClassName: string | undefined;
  if (overdue || request.status === "EXPIRED") {
    badgeClassName = "bg-red-100 text-red-800";
  } else if (request.status === "OPEN") {
    badgeClassName = "bg-brand-gold/40 text-brand-navy";
  }

  return (
    <div className="space-y-1 text-xs">
      <StatusBadge
        className={badgeClassName}
        label={labels[request.status]}
        status={request.status}
      />
      <p className="text-brand-navy/60">
        Requested {formatLocalDateTime24(request.createdAt)}
      </p>
      {request.status === "OPEN" ? (
        <>
          <p
            className={overdue ? "font-semibold text-red-700" : "text-brand-navy/65"}
          >
            {overdue
              ? "Applicant response overdue"
              : "Awaiting applicant response"}
          </p>
          <WorkflowRfiDeadline
            deadlineAt={request.deadlineAt}
            isOverdue={overdue}
            status={request.status}
          />
          {!overdue ? (
            <p className="text-brand-navy/60">
              Task SLA paused while awaiting response.
            </p>
          ) : null}
        </>
      ) : request.respondedAt ? (
        <p className="text-brand-navy/60">
          Applicant response received {formatLocalDateTime24(request.respondedAt)}
        </p>
      ) : request.status === "EXPIRED" ? (
        <p className="text-brand-navy/60">
          Deadline {formatLocalDateTime24(request.deadlineAt)}
        </p>
      ) : null}
    </div>
  );
}
