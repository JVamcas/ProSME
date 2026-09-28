"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/shared/ui/Badge";
import type {
  NotificationDeliveryHistoryItem,
  NotificationDeliveryQuery,
} from "../api/NotificationAdministrationSchemas";
import { useNotificationDeliveries, useRetryNotificationDelivery } from "./useNotificationAdministration";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { RightDrawer } from "@/shared/ui/RightDrawer";

const filterSchema = z.object({
  applicationReference: z.string().max(100),
  dateFrom: z.string(),
  dateTo: z.string(),
  eventKey: z.string().max(200),
  recipient: z.string().max(320),
  sortDirection: z.enum(["asc", "desc"]),
  sortField: z.enum(["createdAt", "nextAttemptAt", "status"]),
  status: z.string(),
});
type FilterValues = z.infer<typeof filterSchema>;

const filterDefaults: FilterValues = {
  applicationReference: "",
  dateFrom: "",
  dateTo: "",
  eventKey: "",
  recipient: "",
  sortDirection: "desc",
  sortField: "createdAt",
  status: "",
};

const retrySchema = z.object({ reason: z.string().trim().min(3).max(500) });
type RetryValues = z.infer<typeof retrySchema>;


function deliveryColumns({
  canRetry,
  onRetry,
}: {
  canRetry: boolean;
  onRetry: (deliveryId: string) => void;
}): DataTableColumn<NotificationDeliveryHistoryItem>[] {
  return [
    {
      id: "event",
      header: "Event / application",
      cell: ({ row }) => (
        <div>
          <p className="font-mono text-xs">{row.original.eventKey}</p>
          <p>{row.original.applicationReference ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "recipient",
      header: "Recipient",
      cell: ({ row }) => (
        <div>
          <p>{row.original.recipientName}</p>
          <p className="text-xs text-brand-navy/55">
            {row.original.recipientEmail}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      enableSorting: false,
      header: "Outcome",
      cell: ({ row }) => (
        <div>
          <StatusBadge status={row.original.status} label={row.original.status} />
          {row.original.failureCode ? (
            <p className="mt-1 text-xs text-red-700">
              {row.original.failureCode}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "templateAttempts",
      header: "Template / attempts",
      cell: ({ row }) => (
        <span>
          v{row.original.templateVersionNumber ?? "—"}
          {" · "}
          {row.original.attemptCount} attempts
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      enableSorting: false,
      header: "Last Updated ",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => canRetry && row.original.status === "FAILED" ? (
        <GeneralButton
          onClick={() => onRetry(row.original.deliveryId)}
          size="compact"
          type="button"
          variant="outline"
        >
          Retry
        </GeneralButton>
      ) : null,
    },
  ];
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export function NotificationDeliveryHistory({
  canRetry = false,
}: {
  canRetry?: boolean;
}) {
  const [query, setQuery] = useState<NotificationDeliveryQuery>({
    page: 1,
    pageSize: 25,
    sortDirection: "desc",
    sortField: "createdAt",
  });
  const [retryId, setRetryId] = useState<string | null>(null);
  const deliveries = useNotificationDeliveries(query);
  const retry = useRetryNotificationDelivery();
  const filters = useForm<FilterValues>({
    defaultValues: filterDefaults,
    resolver: zodResolver(filterSchema),
  });
  const retryForm = useForm<RetryValues>({
    defaultValues: { reason: "" },
    resolver: zodResolver(retrySchema),
  });
  const submitFilters = filters.handleSubmit((values) => {
    setQuery((current) => ({
      ...current,
      applicationReference: values.applicationReference || undefined,
      dateFrom: toIso(values.dateFrom),
      dateTo: toIso(values.dateTo),
      eventKey: values.eventKey || undefined,
      page: 1,
      recipient: values.recipient || undefined,
      sortDirection: values.sortDirection,
      sortField: values.sortField,
      status: values.status
        ? values.status as NotificationDeliveryQuery["status"]
        : undefined,
    }));
  });
  const clearFilters = () => {
    filters.reset(filterDefaults);
    setQuery((current) => ({
      page: 1,
      pageSize: current.pageSize,
      sortDirection: filterDefaults.sortDirection,
      sortField: filterDefaults.sortField,
    }));
  };
  const submitRetry = retryForm.handleSubmit(async ({ reason }) => {
    if (!retryId) return;
    await retry.mutateAsync({ deliveryId: retryId, reason });
    retryForm.reset();
    setRetryId(null);
  });
  const emptyMessage = deliveries.isPending
    ? "Loading delivery history…"
    : deliveries.error?.message ?? "No deliveries match the selected filters.";

  return (
    <div className="space-y-6">
      <FormProvider {...filters}>
        <form onSubmit={submitFilters}>
          <DataTableFilter
            contentClassName="md:grid-cols-2 xl:grid-cols-4"
            defaultExpanded={false}
            description="Filter and sort notification delivery attempts."
            isApplying={deliveries.isFetching}
            onApply={submitFilters}
            onClear={clearFilters}
            title="Delivery filters"
          >
            <FormInput
              label="Event key"
              name="eventKey"
              placeholder="application.submitted"
            />
            <FormSelect
              items={[
                { label: "Pending", value: "PENDING" },
                { label: "Processing", value: "PROCESSING" },
                { label: "Sent", value: "SENT" },
                { label: "Failed", value: "FAILED" },
              ]}
              label="Status"
              name="status"
              placeholder="All statuses"
            />
            <FormInput
              label="Application reference"
              name="applicationReference"
            />
            <FormInput label="Recipient name or email" name="recipient" />
            <FormInput label="From" name="dateFrom" type="datetime-local" />
            <FormInput label="To" name="dateTo" type="datetime-local" />
            <FormSelect
              items={[
                { label: "Created time", value: "createdAt" },
                { label: "Next attempt", value: "nextAttemptAt" },
                { label: "Status", value: "status" },
              ]}
              label="Sort by"
              name="sortField"
            />
            <FormSelect
              items={[
                { label: "Newest / descending", value: "desc" },
                { label: "Oldest / ascending", value: "asc" },
              ]}
              label="Sort direction"
              name="sortDirection"
            />
          </DataTableFilter>
        </form>
      </FormProvider>
      {deliveries.error ? (
        <p className="text-sm text-red-700" role="alert">
          {deliveries.error.message}
        </p>
      ) : null}
      <DataTable
        columns={deliveryColumns({ canRetry, onRetry: setRetryId })}
        data={deliveries.data?.items ?? []}
        emptyMessage={emptyMessage}
        footer={deliveries.data ? (
          <Pagination
            disabled={deliveries.isFetching}
            hasNextPage={deliveries.data.page < deliveries.data.totalPages}
            onNext={() => setQuery((current) => ({
              ...current,
              page: current.page + 1,
            }))}
            onPageSizeChange={(pageSize) => setQuery((current) => ({
              ...current,
              page: 1,
              pageSize,
            }))}
            onPrevious={() => setQuery((current) => ({
              ...current,
              page: current.page - 1,
            }))}
            page={deliveries.data.page}
            pageSize={deliveries.data.pageSize}
            total={deliveries.data.total}
          />
        ) : undefined}
        minWidth={960}
        rowKey={(item) => item.deliveryId}
      />
      <RightDrawer
        description="Review the disclosure independently before the assigned reviewer can continue."
        footer={
          <div className="mt-4 flex gap-3">
            <GeneralButton
              onClick={() => setRetryId(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </GeneralButton>
            <GeneralButton disabled={retry.isPending} type="submit">
              {retry.isPending ? "Scheduling…" : "Schedule retry"}
            </GeneralButton>
          </div>
        }
        onClose={() => setRetryId(null)}
        open={Boolean(retryId)}
        size="xl"
        title="Conflict review"
      >
        <FormProvider {...retryForm}>
          <form
            className="rounded-2xl border border-brand-orange/30 bg-orange-50 p-5"
            onSubmit={submitRetry}
          >
            <h2 className="font-bold text-brand-navy">Schedule delivery retry</h2>
            <FormTextarea
              containerClassName="mt-4"
              label="Reason"
              name="reason"
              required
            />
          </form>
        </FormProvider>
      </RightDrawer>
    </div>
  );
}
