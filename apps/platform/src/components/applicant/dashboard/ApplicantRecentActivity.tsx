import { BellRing } from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { ApplicantDashboardActivity } from "@/modules/dashboard/ApplicantDashboardTypes";

function activityLabel(eventCode: string) {
  if (eventCode === "APPLICATION_SUBMITTED") return "Application submitted";
  if (eventCode === "APPLICATION_DRAFT_UPDATED") {
    return "Application draft updated";
  }
  if (eventCode === "TASK_COMPLETED") return "Application status updated";
  return "Application updated";
}

function EmptyActivity() {
  return (
    <div className="grid min-h-36 place-items-center px-5 py-8 text-center">
      <div>
        <BellRing
          aria-hidden="true"
          className="mx-auto size-7 text-brand-orange"
        />
        <p className="mt-3 font-bold text-brand-navy">
          No recent activity yet
        </p>
        <p className="mt-1 text-sm text-brand-navy/65">
          Application updates will appear here when they become available.
        </p>
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
      className="mt-6 min-h-48 rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm"
    >
      <div className="border-b border-brand-navy/10 px-5 py-4">
        <h2 id="recent-activity-heading" className="font-bold text-brand-navy">
          Recent activity
        </h2>
      </div>
      {activities.length === 0 ? (
        <EmptyActivity />
      ) : (
        <ol className="divide-y divide-brand-navy/10 px-5">
          {activities.map((activity) => (
            <li
              className="flex items-start gap-3 py-4"
              key={`${activity.eventCode}-${activity.applicationId}-${activity.occurredAt}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/10">
                <BellRing
                  aria-hidden="true"
                  className="size-5 text-brand-orange"
                />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-brand-navy">
                  {activityLabel(activity.eventCode)}
                </p>
                <p className="mt-0.5 truncate text-sm text-brand-navy/65">
                  {activity.fundingOpportunityTitle} · {activity.applicationReference}
                </p>
                <time
                  className="mt-1 block text-xs text-brand-navy/50"
                  dateTime={activity.occurredAt}
                >
                  {formatLocalDateTime24(activity.occurredAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
