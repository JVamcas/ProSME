"use client";

import { UsersRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  ActivateButton,
  DeactivateButton,
} from "@/components/ui/action-buttons";
import { IconButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { Badge } from "@/shared/ui/Badge";
import type {
  NotificationEventRuleSummary,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import { NotificationRuleRecipientsDialog } from "./NotificationRuleRecipientsDialog";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";
import { useNotificationChannels } from "./NotificationTemplateHooks";
import {
  useNotificationCatalogs,
  useNotificationRule,
  useNotificationRules,
  useUpdateNotificationRuleFromList,
} from "./useNotificationAdministration";

function RecipientSummary({ rule }: { rule: NotificationEventRuleSummary }) {
  if (!rule.recipients.length) {
    return (
      <span className="text-sm text-brand-navy/45">
        No recipients configured
      </span>
    );
  }
  return (
    <div className="space-y-3">
      {rule.recipients.map((recipient) => (
        <div key={`${recipient.recipientType}:${recipient.targetId ?? ""}`}>
          <p className="text-sm font-semibold text-brand-navy">
            {notificationRecipientLabel(recipient.recipientType)}
            {recipient.targetDisplayName
              ? ` · ${recipient.targetDisplayName}`
              : ""}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {recipient.channels.length ? (
              recipient.channels.map((channel) => (
                <Badge key={channel.code} variant="ghost">
                  {channel.displayName}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-brand-navy/45">No channels</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ruleColumns({
  canUpdate,
  isUpdating,
  onManageRecipients,
  onToggle,
}: {
  canUpdate: boolean;
  isUpdating: (rule: NotificationEventRuleSummary) => boolean;
  onManageRecipients: (rule: NotificationEventRuleSummary) => void;
  onToggle: (rule: NotificationEventRuleSummary) => void;
}): DataTableColumn<NotificationEventRuleSummary>[] {
  return [
    {
      accessorKey: "catalogName",
      header: "Catalog",
      cell: ({ row }) => (
        <p className="font-semibold mt-2 text-sm text-brand-navy/50">
          {row.original.catalogName}
        </p>
      ),
    },
    {
      accessorKey: "eventName",
      header: "Event",
      cell: ({ row }) => (
        <div className="min-w-80">
          <p className="font-semibold text-brand-navy">
            {row.original.eventName}
          </p>
          <p className="mt-1 text-sm leading-5 text-brand-navy/65">
            {row.original.eventDescription}
          </p>
          <p className="mt-2 font-mono text-xs text-brand-navy/45">
            {row.original.eventKey}
          </p>
        </div>
      ),
    },
    {
      id: "recipients",
      header: "Recipients",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="min-w-64">
          <RecipientSummary rule={row.original} />
        </div>
      ),
    },
    {
      accessorKey: "isEnabled",
      header: "Status",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <div className="space-y-2">
            <Badge variant={row.original.isEnabled ? "success" : "danger"}>
              {row.original.isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            {!row.original.eventEnabled ? (
              <p className="text-xs text-brand-navy/50">Event disabled</p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const rule = row.original;
        return (
          <div className="flex items-center justify-start gap-1">
            {canUpdate ? (
              <>
                <IconButton
                  compact
                  disabled={isUpdating(rule)}
                  label={`Manage recipients for ${rule.eventName}`}
                  onClick={() => onManageRecipients(rule)}
                  variant="outline"
                  title="Manage recipients."
                >
                  <UsersRound aria-hidden="true" className="size-4" />
                </IconButton>
                {rule.isEnabled ? (
                  <DeactivateButton
                    disabled={isUpdating(rule)}
                    onClick={() => onToggle(rule)}
                    title={`Deactivate ${rule.eventName}`}
                  />
                ) : (
                  <ActivateButton
                    disabled={isUpdating(rule)}
                    onClick={() => onToggle(rule)}
                    title={`Activate ${rule.eventName}`}
                  />
                )}
              </>
            ) : null}
          </div>
        );
      },
    },
  ];
}

function ruleUpdate(
  rule: NotificationEventRuleSummary,
  isEnabled: boolean,
): NotificationEventRuleUpdate {
  return {
    eventEnabled: rule.eventEnabled,
    expectedUpdatedAt: rule.updatedAt,
    isEnabled,
    recipients: rule.recipients.map((recipient) => {
      const base = {
        channelCodes: recipient.channels.map((channel) => channel.code),
        isRequired: recipient.isRequired,
      };
      if (recipient.recipientType === "SPECIFIC_USER") {
        return {
          ...base,
          recipientType: "SPECIFIC_USER" as const,
          targetId: recipient.targetId,
        };
      }
      if (recipient.recipientType === "SPECIFIC_ROLE") {
        return {
          ...base,
          recipientType: "SPECIFIC_ROLE" as const,
          targetId: recipient.targetId,
        };
      }
      return { ...base, recipientType: recipient.recipientType };
    }),
  };
}

export function NotificationRuleList({ canUpdate }: { canUpdate: boolean }) {
  const [search, setSearch] = useState("");
  const [catalogKey, setCatalogKey] = useState("");
  const [recipientRule, setRecipientRule] =
    useState<NotificationEventRuleSummary | null>(null);
  const deferredSearch = useDeferredValue(search);
  const filters = useMemo(
    () => ({
      catalogKey: catalogKey || undefined,
      search: deferredSearch.trim() || undefined,
    }),
    [catalogKey, deferredSearch],
  );
  const query = useNotificationRules(filters);
  const recipientRuleDetail = useNotificationRule(
    recipientRule?.eventKey ?? "",
    recipientRule !== null,
  );
  const catalogs = useNotificationCatalogs();
  const channels = useNotificationChannels();
  const update = useUpdateNotificationRuleFromList();
  const hasFilters = Boolean(search || catalogKey);
  const columns = useMemo(
    () =>
      ruleColumns({
        canUpdate,
        isUpdating: (rule) =>
          update.isPending && update.variables?.eventKey === rule.eventKey,
        onManageRecipients: setRecipientRule,
        onToggle: (rule) => {
          void update
            .mutateAsync({
              eventKey: rule.eventKey,
              input: ruleUpdate(rule, !rule.isEnabled),
            })
            .then(() => {
              toast.success(
                `${rule.eventName} ${rule.isEnabled ? "deactivated" : "activated"}.`,
              );
            })
            .catch((error: unknown) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Unable to update rule.",
              );
            });
        },
      }),
    [canUpdate, update],
  );

  return (
    <div className="space-y-6">
      <DataTableFilter
        collapsible={false}
        contentClassName="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"
        isClearDisabled={!hasFilters}
        onClear={() => {
          setSearch("");
          setCatalogKey("");
        }}
        title="Search and filters"
      >
        <FormInput
          id="notification-rule-search"
          label="Search rules"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by event, catalog, description, recipient, or channel"
          type="search"
          value={search}
        />
        <FormSelect
          id="notification-rule-catalog"
          items={
            catalogs.data
              ?.filter((catalog) => catalog.configurableEventCount > 0)
              .map((catalog) => ({
                label: catalog.displayName,
                value: catalog.catalogKey,
              })) ?? []
          }
          label="Catalog"
          onChange={(event) => setCatalogKey(event.target.value)}
          placeholder="All catalogs"
          value={catalogKey}
        />
      </DataTableFilter>

      {query.error ? (
        <p className="text-sm text-red-700" role="alert">
          {query.error.message}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        data={
          query.data?.filter(
            (rule) => rule.ruleEligibility === "CONFIGURABLE",
          ) ?? []
        }
        emptyMessage={
          query.isPending
            ? "Loading event rules…"
            : "No event rules matched the current filters."
        }
        minWidth={1040}
        rowKey={(rule) => rule.eventKey}
        toolbar={{
          description: `${query.data?.length ?? 0} matching rules`,
          title: "Event Rule Register",
        }}
      />
      <NotificationRuleRecipientsDialog
        channels={channels.data ?? []}
        isPending={update.isPending}
        onClose={() => setRecipientRule(null)}
        onSubmit={async (input) => {
          if (!recipientRule) return;
          try {
            await update.mutateAsync({
              eventKey: recipientRule.eventKey,
              input,
            });
            toast.success(`Recipients updated for ${recipientRule.eventName}.`);
            setRecipientRule(null);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to update recipients.",
            );
          }
        }}
        rule={recipientRuleDetail.data ?? null}
      />
    </div>
  );
}
