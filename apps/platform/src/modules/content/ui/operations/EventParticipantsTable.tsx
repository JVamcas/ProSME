"use client";

import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { Pagination } from "@/shared/ui/Pagination";
import { QuerySection } from "@/shared/ui/QuerySection";
import { Badge } from "@/shared/ui/Badge";
import { FormInput } from "@/components/ui/form-fields";
import { GeneralButton } from "@/shared/ui/Button";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type {
  EventParticipantStatus,
  EventDeliveryRow,
} from "../../api/EventOperationsTypes";
import { useEventParticipants, useEventDelivery } from "./useEventOperations";

const searchSchema = z.object({ search: z.string().trim().max(200) });
export function EventDeliveryBadge({ state }: { state: string }) {
  const failed = state === "Failed" || state === "Retrying";
  return (
    <Badge
      variant={failed ? "danger" : "outline"}
      className={
        state === "Sent" || state === "Scheduled"
          ? "border-0 bg-green-100 text-green-800"
          : undefined
      }
    >
      {state}
    </Badge>
  );
}

export function EventParticipantsTable({
  eventId,
  timezone,
}: {
  eventId: number;
  timezone: string;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const form = useForm({
    defaultValues: { search: "" },
    resolver: zodResolver(searchSchema),
  });
  const query = useEventParticipants(eventId, page, search, true);
  const columns: DataTableColumn<EventParticipantStatus>[] = [
    { accessorKey: "fullName", header: "Participant", enableSorting: false },
    {
      accessorKey: "organisation",
      header: "Organisation",
      enableSorting: false,
      cell: ({ row }) => row.original.organisation || "—",
    },
    {
      accessorKey: "registeredAt",
      header: "Registered",
      enableSorting: false,
      cell: ({ row }) =>
        formatLocalDateTime24(row.original.registeredAt, "—", timezone),
    },
    {
      accessorKey: "confirmation",
      header: "Confirmation",
      enableSorting: false,
      cell: ({ row }) => (
        <EventDeliveryBadge state={row.original.confirmation} />
      ),
    },
    {
      accessorKey: "reminder",
      header: "Reminder",
      enableSorting: false,
      cell: ({ row }) => <EventDeliveryBadge state={row.original.reminder} />,
    },
  ];
  return (
    <div className="space-y-5">
      <FormProvider {...form}>
        <form
          className="flex gap-3"
          onSubmit={form.handleSubmit((values) => {
            setSearch(values.search);
            setPage(1);
          })}
        >
          <FormInput
            containerClassName="flex-1"
            name="search"
            label={
              <span className="sr-only">
                Search registrations by name or organisation
              </span>
            }
            placeholder="Search registrations by name or organisation…"
          />
          <GeneralButton type="submit" variant="outline">
            Search
          </GeneralButton>
        </form>
      </FormProvider>
      <QuerySection
        query={query}
        title="registrations"
        loading={<p role="status">Loading registrations…</p>}
      >
        {(data) => (
          <>
            <DataTable
              columns={columns}
              data={data.items}
              minWidth={760}
              emptyMessage="No matching registrations."
              rowKey={(item) => item.id}
            />
            <Pagination
              page={page}
              pageSize={4}
              total={data.total}
              hasNextPage={page * 4 < data.total}
              onNext={() => setPage(page + 1)}
              onPrevious={() => setPage(page - 1)}
            />
          </>
        )}
      </QuerySection>
    </div>
  );
}

export function EventEmailDeliveryTable({
  eventId,
  timezone,
}: {
  eventId: number;
  timezone: string;
}) {
  const [page, setPage] = useState(1);
  const query = useEventDelivery(eventId, page, true);
  const columns: DataTableColumn<EventDeliveryRow>[] = [
    { accessorKey: "participant", header: "Participant", enableSorting: false },
    { accessorKey: "kind", header: "Email", enableSorting: false },
    {
      accessorKey: "state",
      header: "Delivery",
      enableSorting: false,
      cell: ({ row }) => <EventDeliveryBadge state={row.original.state} />,
    },
    {
      accessorKey: "dueAt",
      header: "Scheduled for",
      enableSorting: false,
      cell: ({ row }) =>
        formatLocalDateTime24(row.original.dueAt, "—", timezone),
    },
    {
      accessorKey: "sentAt",
      header: "Sent at",
      enableSorting: false,
      cell: ({ row }) =>
        formatLocalDateTime24(row.original.sentAt, "—", timezone),
    },
    { accessorKey: "attempts", header: "Attempts", enableSorting: false },
    {
      accessorKey: "errorCode",
      header: "Delivery issue",
      enableSorting: false,
    },
  ];
  return (
    <QuerySection
      query={query}
      title="email delivery"
      loading={<p role="status">Loading email delivery…</p>}
    >
      {(data) => (
        <>
          <DataTable
            columns={columns}
            data={data.items}
            minWidth={900}
            emptyMessage="No email intents recorded."
            rowKey={(item) => item.id}
          />
          <Pagination
            page={page}
            pageSize={10}
            total={data.total}
            hasNextPage={page * 10 < data.total}
            onNext={() => setPage(page + 1)}
            onPrevious={() => setPage(page - 1)}
          />
        </>
      )}
    </QuerySection>
  );
}
