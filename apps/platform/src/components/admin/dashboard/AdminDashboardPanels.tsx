import { ClipboardCheck } from "lucide-react";

import type { AdminDashboardActivity } from "@/modules/dashboard/AdminDashboardTypes";
import { formatLocalTime24 } from "@/lib/dateUtils";

function activityLabel(eventCode: string) {
  if (eventCode === "APPLICATION_SUBMITTED") return "Application submitted";
  return eventCode
    .toLocaleLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function AdminDashboardPanels({
  activities,
}: {
  activities: AdminDashboardActivity[];
}) {
  return (
    <section className="rounded-2xl border border-brand-navy/10 bg-brand-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-brand-navy">Recent activity</h2>
        <span className="text-xs text-brand-navy/50">Latest 6 events</span>
      </div>
      {activities.length ? (
        <ol className="mt-4 divide-y divide-brand-navy/10">
          {activities.map((activity) => (
            <li
              className="flex gap-3 py-4 first:pt-2"
              key={`${activity.eventCode}-${activity.applicationId}-${activity.occurredAt}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-orange/10">
                <ClipboardCheck
                  aria-hidden="true"
                  className="size-5 text-brand-orange"
                />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-brand-navy">
                  {activityLabel(activity.eventCode)}
                </p>
                <p className="mt-0.5 truncate text-sm text-brand-navy/65">
                  {activity.applicationReference} · {activity.actorName}
                </p>
                <time
                  className="mt-1 block text-xs text-brand-navy/45"
                  dateTime={activity.occurredAt}
                >
                  {formatLocalTime24(activity.occurredAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-8 rounded-xl bg-brand-navy/5 px-5 py-8 text-center text-sm text-brand-navy/65">
          No workflow activity exists for this period and access scope.
        </p>
      )}
    </section>
  );
}
