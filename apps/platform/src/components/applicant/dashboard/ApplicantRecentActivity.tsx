import {
  BellRing,
  CheckCircle2,
  ChevronRight,
  FilePenLine,
  FileText,
} from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { ApplicantDashboardActivity } from "@/modules/dashboard/ApplicantDashboardTypes";
import { cn } from "@/lib/utils";

function activityLabel(eventCode: string) {
  if (eventCode === "APPLICATION_SUBMITTED") return "Application submitted";

  if (eventCode === "APPLICATION_DRAFT_UPDATED") {
    return "Application draft updated";
  }

  if (eventCode === "TASK_COMPLETED") {
    return "Application status updated";
  }

  return "Application updated";
}

function activityDescription(eventCode: string) {
  if (eventCode === "APPLICATION_SUBMITTED") {
    return "Your application has been successfully submitted and is now under review.";
  }

  if (eventCode === "APPLICATION_DRAFT_UPDATED") {
    return "You updated your application draft.";
  }

  if (eventCode === "TASK_COMPLETED") {
    return "Your application has progressed to the next stage.";
  }

  return "There has been an update to your application.";
}

function activityIcon(eventCode: string) {
  if (eventCode === "APPLICATION_SUBMITTED") {
    return FileText;
  }

  if (eventCode === "APPLICATION_DRAFT_UPDATED") {
    return FilePenLine;
  }

  if (eventCode === "TASK_COMPLETED") {
    return CheckCircle2;
  }

  return BellRing;
}

function activityIconClass(eventCode: string) {
  if (eventCode === "APPLICATION_DRAFT_UPDATED") {
    return "bg-blue-50 text-blue-600";
  }

  if (eventCode === "TASK_COMPLETED") {
    return "bg-emerald-50 text-emerald-600";
  }

  return "bg-brand-orange/10 text-brand-orange";
}

function EmptyActivity() {
  return (
    <div className="flex min-h-[340px] flex-col">
      <div className="grid flex-1 place-items-center px-6 py-10 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-brand-orange/10">
            <BellRing
              aria-hidden="true"
              className="size-9 text-brand-orange"
            />
          </span>

          <p className="mt-5 text-lg font-bold text-brand-navy">
            No recent activity yet
          </p>

          <p className="mt-2 text-sm leading-6 text-brand-navy/60">
            Application updates will appear here when they become available.
          </p>
        </div>
      </div>

      <div className="m-4 rounded-xl bg-slate-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600">
            <BellRing aria-hidden="true" className="size-4" />
          </span>

          <div>
            <p className="text-sm font-bold text-brand-navy">Tip</p>
            <p className="mt-0.5 text-sm leading-5 text-brand-navy/60">
              Check back here to see status changes and other updates to your
              applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApplicantRecentActivity({
  activities,
}: {
  activities: ApplicantDashboardActivity[];
}) {
  return (
    <section
      aria-labelledby="recent-activity-heading"
      className="mt-6 overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b border-brand-navy/10 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-orange/10">
            <BellRing
              aria-hidden="true"
              className="size-5 text-brand-orange"
            />
          </span>

          <div>
            <h2
              id="recent-activity-heading"
              className="font-bold text-brand-navy"
            >
              Recent activity
            </h2>

            <p className="mt-0.5 text-sm text-brand-navy/55">
              Your latest application updates
            </p>
          </div>
        </div>

        {activities.length > 0 && (
          <button
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-navy transition hover:text-brand-orange"
            type="button"
          >
            View all
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <EmptyActivity />
      ) : (
        <div className="px-5 sm:px-6">
          <ol className="relative">
            {activities.map((activity, index) => {
              const Icon = activityIcon(activity.eventCode);
              const isLast = index === activities.length - 1;

              return (
                <li
                  className="relative flex gap-4 py-5"
                  key={`${activity.eventCode}-${activity.applicationId}-${activity.occurredAt}`}
                >
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-5 top-14 w-px bg-brand-navy/10"
                    />
                  )}

                  <span
                    className={cn(
                      "relative z-10 grid size-10 shrink-0 place-items-center rounded-full",
                      activityIconClass(activity.eventCode),
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>

                  <div className="min-w-0 flex-1 border-b border-brand-navy/10 pb-5 last:border-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-brand-navy">
                          {activityLabel(activity.eventCode)}
                        </p>

                        <p className="mt-1 truncate text-sm text-brand-navy/65">
                          {activity.fundingOpportunityTitle}
                          <span className="px-1.5 text-brand-navy/30">·</span>
                          {activity.applicationReference}
                        </p>
                      </div>

                      <time
                        className="shrink-0 text-xs text-brand-navy/45"
                        dateTime={activity.occurredAt}
                      >
                        {formatLocalDateTime24(activity.occurredAt)}
                      </time>
                    </div>

                    <p className="mt-2 text-sm leading-5 text-brand-navy/55">
                      {activityDescription(activity.eventCode)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}