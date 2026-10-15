"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { FormInput } from "@/components/ui/form-fields";
import {
  notificationTemplateTargetQuerySchema,
  type NotificationTemplateTargetQuery,
} from "../api/NotificationTemplateSchemas";
import { ChevronDown, ChevronRight, FileStack } from "lucide-react";
import { useMemo, useState } from "react";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { Badge } from "@/shared/ui/Badge";
import type { NotificationTemplateTargetSummary } from "../api/NotificationTemplateSchemas";
import { useNotificationChannel } from "./NotificationTemplateHooks";

const scopeLabels = {
  CATALOG: "Catalog",
  EVENT: "Event",
  GLOBAL: "Global",
} as const;

function targetSubtitle(target: NotificationTemplateTargetSummary) {
  if (target.scope === "GLOBAL") return "Global";
  if (target.scope === "CATALOG") {
    return [target.catalogName, target.catalogKey].filter(Boolean).join(" · ");
  }
  return target.eventKey ?? "Event-specific template";
}

function TargetHeader({
  channelCode,
  compact = false,
  target,
}: {
  channelCode: string;
  compact?: boolean;
  target: NotificationTemplateTargetSummary;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="uppercase tracking-[0.2em]" variant="subtle">
            {scopeLabels[target.scope]}
          </Badge>
          <Badge variant={target.isEnabled ? "success" : "outline"}>
            {target.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <div className="space-y-1">
          <h3
            className={
              compact
                ? "text-lg font-bold text-brand-navy"
                : "text-2xl font-bold tracking-tight text-brand-navy"
            }
          >
            {target.label}
          </h3>
          <p className="text-sm text-brand-navy/70">{targetSubtitle(target)}</p>
          {target.description ? (
            <p className="max-w-3xl text-sm leading-6 text-brand-navy/65">
              {target.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={target.publishedVersionNumber ? "success" : "outline"}
          >
            {target.publishedVersionNumber
              ? `Published: v${target.publishedVersionNumber}`
              : "No Published Version"}
          </Badge>
          <span className="text-sm text-brand-navy/65">
            {target.versionCount} version(s)
          </span>
        </div>
        <p className="text-sm text-brand-navy/65">
          Last updated: {formatLocalDateTime24(target.lastUpdatedAt)}
        </p>
        <GeneralButtonLink
          href={`/admin/notifications/channels/${channelCode}/templates/${target.id}`}
          size="sm"
          variant="outlineOrange"
        >
          <FileStack aria-hidden="true" className="size-4" />
          Manage Versions
        </GeneralButtonLink>
      </div>
    </div>
  );
}

function CatalogTargetCard({
  channelCode,
  eventTargets,
  target,
}: {
  channelCode: string;
  eventTargets: NotificationTemplateTargetSummary[];
  target: NotificationTemplateTargetSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="overflow-hidden rounded-t-[1.75rem] border border-brand-navy/10 bg-brand-white shadow-sm">
      <div className="space-y-4 bg-brand-white p-5 sm:p-6">
        <TargetHeader channelCode={channelCode} target={target} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-navy/65">
            {eventTargets.length} event template target
            {eventTargets.length === 1 ? "" : "s"}
          </p>
          <GeneralButton
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            size="sm"
            variant="outline"
          >
            {expanded ? (
              <ChevronDown aria-hidden="true" className="size-4" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-4" />
            )}
            {expanded ? "Hide Events" : "Show Events"}
          </GeneralButton>
        </div>
      </div>
      {expanded ? (
        <div className="divide-y divide-brand-navy/10">
          {eventTargets.length ? (
            eventTargets.map((eventTarget) => (
              <div className="p-5 sm:p-6" key={eventTarget.id}>
                <TargetHeader
                  channelCode={channelCode}
                  compact
                  target={eventTarget}
                />
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-brand-navy/60">
              No event-specific template targets are configured for this
              catalog.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function NotificationChannelWorkspace({
  channelCode,
}: {
  channelCode: string;
}) {
  const [search, setSearch] = useState("");
  const form = useForm<NotificationTemplateTargetQuery>({
    defaultValues: { search: "" },
    resolver: zodResolver(notificationTemplateTargetQuerySchema),
  });
  const query = useNotificationChannel(channelCode, search);
  const groupedTargets = useMemo(() => {
    const targets = query.data?.targets ?? [];
    const eventTargets = targets.filter((target) => target.scope === "EVENT");
    return {
      catalogTargets: targets.filter((target) => target.scope === "CATALOG"),
      eventTargets,
      globalTarget: targets.find((target) => target.scope === "GLOBAL"),
    };
  }, [query.data?.targets]);

  return (
    <div className="space-y-5">
      <FormProvider {...form}>
        <form
          className="flex flex-col gap-3 rounded-xl border border-brand-navy/10 bg-brand-white p-4 sm:flex-row sm:items-end"
          onSubmit={form.handleSubmit((values) =>
            setSearch(values.search ?? ""),
          )}
        >
          <FormInput
            containerClassName="flex-1"
            label="Search catalogs"
            maxLength={200}
            name="search"
            placeholder="Catalog name, key or description"
            type="search"
          />
          <GeneralButton disabled={query.isFetching} type="submit">
            Search
          </GeneralButton>
          <GeneralButton
            onClick={() => {
              form.reset({ search: "" });
              setSearch("");
            }}
            type="button"
            variant="outline"
          >
            Clear
          </GeneralButton>
        </form>
      </FormProvider>
      {query.isPending ? (
        <PortalLoadingState description="Just a moment..." title="" />
      ) : query.error ? (
        <PortalErrorState
          description={query.error.message}
          title={query.error.name}
        />
      ) : (
        <div aria-busy={query.isFetching} className="space-y-5">
          {groupedTargets.globalTarget ? (
            <article className="rounded-t-[1.75rem] border border-brand-navy/10 bg-brand-white p-5 sm:p-6">
              <TargetHeader
                channelCode={channelCode}
                target={groupedTargets.globalTarget}
              />
            </article>
          ) : null}
          {groupedTargets.catalogTargets.map((catalogTarget) => (
            <CatalogTargetCard
              channelCode={channelCode}
              eventTargets={groupedTargets.eventTargets.filter(
                (eventTarget) =>
                  eventTarget.catalogKey === catalogTarget.catalogKey,
              )}
              key={catalogTarget.id}
              target={catalogTarget}
            />
          ))}
          {!groupedTargets.catalogTargets.length ? (
            <p
              className="rounded-xl border border-dashed border-brand-navy/20 p-5 text-sm text-brand-navy/65"
              role="status"
            >
              {search
                ? "No catalogs match your search."
                : "No catalog template targets are configured."}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
