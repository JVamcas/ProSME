"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/shared/ui/FormPrimitives";
import { Pagination } from "@/components/ui/pagination";
import { GeneralButton } from "@/shared/ui/Button";
import { cn } from "@/lib/utils";
import { workQueueListSchema } from "../WorkQueueSchemas";
import { useWorkQueue } from "@/modules/work-queue/ui/useWorkQueue";
import type { WorkQueueScope } from "@/modules/work-queue/WorkQueueTypes";
import { PageShell } from "@/shared/ui/PageShell";
import { WorkQueueTable } from "./WorkQueueTable";

const scopes: Array<{ label: string; value: WorkQueueScope }> = [
  { label: "Tasks", value: "mine" },
  { label: "Overdue", value: "overdue" },
  { label: "Due soon", value: "due-soon" },
];

function QueueTabs({
  onChange,
  scope,
}: {
  onChange: (scope: WorkQueueScope) => void;
  scope: WorkQueueScope;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-brand-navy/10">
      {scopes.map((item) => (
        <GeneralButton
          className={cn(
            "h-auto whitespace-nowrap rounded-none border-b-2 px-4 py-3 text-sm font-semibold",
            scope === item.value
              ? "border-brand-orange text-brand-navy"
              : "border-transparent text-brand-navy/55",
          )}
          aria-pressed={scope === item.value}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
          variant="ghost"
        >
          {item.label}
        </GeneralButton>
      ))}
    </div>
  );
}

const searchSchema = workQueueListSchema.pick({ search: true });

export function WorkQueueWorkspace({
  assignmentScope = "assigned",
}: {
  assignmentScope?: "assigned" | "all";
}) {
  const monitor = assignmentScope === "all";
  const [scope, setScope] = useState<WorkQueueScope>("mine");
  const { register, handleSubmit, reset } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: { search: "" },
  });
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);

  const queue = useWorkQueue({
    assignmentScope,
    after: cursors.at(-1),
    limit: 25,
    search: search || undefined,
    scope,
  });
  const items = queue.data?.items ?? [];
  const changeScope = (next: WorkQueueScope) => {
    setScope(next);
    setCursors([]);
  };
  const applySearch = handleSubmit((values) => {
    setSearch(values.search ?? "");
    setCursors([]);
  });
  const clearSearch = () => {
    reset({ search: "" });
    setSearch("");
    setCursors([]);
  };

  const emptyMessage = queue.isPending
    ? "Loading assigned tasks…"
    : queue.isError
      ? queue.error.message
      : "No actionable tasks match these filters.";

  return (
    <PageShell
      eyebrow={monitor ? "Process Monitor" : "My Queue"}
      description={
        monitor
          ? "Track tasks assigned across all users."
          : "Tasks assigned to you."
      }
      title="Assigned tasks"
    >
      <section className="overflow-hidden rounded-t-2xl border border-brand-navy/10 bg-white shadow-sm p-2">
        <QueueTabs onChange={changeScope} scope={scope} />
        <div className="p-4">
          <DataTableFilter
            collapsible
            defaultExpanded={false}
            description={
              monitor
                ? "Search all assigned tasks."
                : "Search the tasks assigned to you."
            }
            onApply={applySearch}
            onClear={clearSearch}
            title="Queue filters"
          >
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
              <Input
                aria-label="Search work queue"
                className="pl-10"
                placeholder="Search reference, applicant, business or task"
                {...register("search")}
              />
            </div>
          </DataTableFilter>
        </div>
        <WorkQueueTable emptyMessage={emptyMessage} items={items} />
        <Pagination
          disabled={queue.isFetching}
          hasNextPage={Boolean(queue.data?.nextCursor)}
          onNext={() => {
            const nextCursor = queue.data?.nextCursor;
            if (nextCursor) {
              setCursors((current) => [...current, nextCursor]);
            }
          }}
          onPrevious={() => setCursors((current) => current.slice(0, -1))}
          page={cursors.length + 1}
          pageSize={25}
          total={queue.data?.total ?? 0}
        />
      </section>
    </PageShell>
  );
}
