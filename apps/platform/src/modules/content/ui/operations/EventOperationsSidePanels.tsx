"use client";

import { UsersRound } from "lucide-react";
import { GeneralButton } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { isEventRegistrationOpen } from "../../domain/EventRegistrationPolicy";
import type { EventOperationsOverview } from "../../api/EventOperationsTypes";

export function EventOperationsSidePanels({
  data,
  onManageSettings,
}: {
  data: EventOperationsOverview;
  onManageSettings: () => void;
}) {
  const { event, permissions, settings } = data;
  const open = isEventRegistrationOpen(event, settings, new Date());
  return (
    <aside className="grid gap-4">
      {permissions.settings ? (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Registration window</h2>
              <Badge
                variant="outline"
                className={open ? "bg-green-100 text-green-800" : undefined}
              >
                {open ? "Open" : "Closed"}
              </Badge>
            </div>
            <dl className="my-5 grid gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Opens</dt>
                <dd>
                  {formatLocalDateTime24(
                    settings?.opensAt,
                    "No opening limit",
                    event.timezone,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Closes</dt>
                <dd>
                  {formatLocalDateTime24(
                    settings?.closesAt,
                    "At event start",
                    event.timezone,
                  )}
                </dd>
              </div>
            </dl>
            <GeneralButton className="w-full" onClick={onManageSettings}>
              Manage registration
            </GeneralButton>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Event emails</h2>
            <dl className="mt-5 grid gap-4 text-sm">
              <div>
                <dt className="font-bold">Confirmation</dt>
                <dd className="mt-1 text-slate-600">
                  {settings?.confirmationEnabled === false
                    ? "Disabled"
                    : "Automatically after registration"}
                </dd>
              </div>
              <div className="border-t pt-4">
                <dt className="font-bold">Reminder</dt>
                <dd className="mt-1 text-slate-600">
                  {settings?.reminderEnabled === false
                    ? "Disabled"
                    : `${settings?.reminderHours ?? 24} hours before event`}
                </dd>
              </div>
            </dl>
            <GeneralButton
              variant="ghost"
              className="mt-4 px-0"
              onClick={onManageSettings}
            >
              Manage email settings
            </GeneralButton>
          </section>
        </>
      ) : null}
    </aside>
  );
}
