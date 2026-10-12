"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/ui/tabs";
import {
  CalendarDays,
  Mail,
  TriangleAlert,
  UsersRound,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { GeneralButtonLink } from "@/shared/ui/Button";
import { DashboardMetricSummary } from "@/shared/ui/DashboardMetricSummary";
import { formatEventSchedule } from "../../EventSchedulePresentation";
import type { EventOperationsOverview } from "../../api/EventOperationsTypes";
import { EventOperationsSidePanels } from "./EventOperationsSidePanels";
import { EventSettingsForm } from "./EventSettingsForm";
import {
  EventEmailDeliveryTable,
  EventParticipantsTable,
} from "./EventParticipantsTable";
import { useEventOverview } from "./useEventOperations";

type Tab = "registrations" | "settings" | "delivery";
export function EventOperationsWorkspace({
  initial,
}: {
  initial: EventOperationsOverview;
}) {
  const query = useEventOverview(initial.event.id);
  const data = query.data ?? initial;
  const { event, permissions, settings } = data;
  const tabs = [
    ...(permissions.participants
      ? [{ id: "registrations" as const, label: "Registrations" }]
      : []),
    ...(permissions.settings
      ? [{ id: "settings" as const, label: "Registration settings" }]
      : []),
    ...(permissions.delivery
      ? [{ id: "delivery" as const, label: "Email delivery" }]
      : []),
  ];
  const [tab, setTab] = useState<Tab>(tabs[0]?.id ?? "settings");
  const metrics = [
    { label: "Registered", value: data.registered, icon: UsersRound },
    { label: "Confirmations sent", value: data.confirmationsSent, icon: Mail },
    {
      label: "Reminders scheduled",
      value: data.remindersScheduled,
      icon: CalendarDays,
    },
    {
      label: "Delivery issues",
      value: data.deliveryIssues,
      icon: TriangleAlert,
    },
  ];
  return (
    <main className="min-w-0 space-y-6 text-brand-navy">
      <header className="rounded-xl bg-brand-cream p-5 sm:p-7">
        <p className="mb-4 text-sm">
          <Link href="/admin/events">Operations / Events</Link>
        </p>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold sm:text-4xl">{event.title}</h1>
            <p className="mt-3 text-lg text-brand-navy/70">
              {formatEventSchedule({
                date: event.startsAt,
                endsAt: event.endsAt,
                timezone: event.timezone,
              })}{" "}
              · {event.location}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <GeneralButtonLink variant="outline" href={`/events/${event.slug}`}>
              <ExternalLink className="size-4" aria-hidden="true" />
              View public page
            </GeneralButtonLink>
            <GeneralButtonLink
              variant="outline"
              href={`/cms/collections/events/${event.id}`}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit content in CMS
            </GeneralButtonLink>
          </div>
        </div>
      </header>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <DashboardMetricSummary
                compact
                key={metric.label}
                icon={metric.icon}
                iconTone="orange"
                label={metric.label}
                value={metric.value === null ? "—" : String(metric.value)}
                supportingText={
                  metric.value === null ? "Access restricted" : ""
                }
              />
            ))}
          </div>
          <Tabs
            ariaLabel="Event operations"
            accent="orange"
            defaultSelectedId={tabs[0]?.id ?? "settings"}
            selectedId={tab}
            onSelectionChange={setTab}
            items={tabs}
            listClassName="border-b border-slate-200"
            selectedContent={
              <>
                {tab === "registrations" && permissions.participants ? (
                  <EventParticipantsTable
                    eventId={event.id}
                    timezone={event.timezone}
                  />
                ) : null}
                {tab === "settings" && permissions.settings ? (
                  <EventSettingsForm
                    key={settings?.eventId ?? "new"}
                    eventId={event.id}
                    settings={settings}
                    editable={permissions.update}
                  />
                ) : null}
                {tab === "delivery" && permissions.delivery ? (
                  <EventEmailDeliveryTable
                    eventId={event.id}
                    timezone={event.timezone}
                  />
                ) : null}
              </>
            }
          />
        </div>
        <EventOperationsSidePanels
          data={data}
          onManageSettings={() => setTab("settings")}
        />
      </div>
    </main>
  );
}
