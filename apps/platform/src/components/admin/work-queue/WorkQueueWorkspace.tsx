"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  useClaimTask,
  useWorkQueue,
} from "@/modules/work-queue/WorkQueueHooks";
import type {
  WorkQueueRow,
  WorkQueueScope,
} from "@/modules/work-queue/WorkQueueTypes";
import { PageShell } from "@/shared/ui/PageShell";
import { toast } from "@/shared/ui/Toast";
import { WorkQueueTable } from "./WorkQueueTable";

const scopes: Array<{ label: string; value: WorkQueueScope }> = [
  { label: "My tasks", value: "mine" },
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
        <button
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold",
            scope === item.value
              ? "border-brand-orange text-brand-navy"
              : "border-transparent text-brand-navy/55",
          )}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function WorkQueueWorkspace() {
  const [scope, setScope] = useState<WorkQueueScope>("mine");
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [cursors, setCursors] = useState<string[]>([]);

  const queue = useWorkQueue({
    after: cursors.at(-1),
    limit: 25,
    search: search || undefined,
    scope,
  });
  const claim = useClaimTask();
  const items = queue.data?.items ?? [];
  const changeScope = (next: WorkQueueScope) => {
    setScope(next);
    setCursors([]);
  };
  const applySearch = () => {
    setSearch(draftSearch.trim());
    setCursors([]);
  };
  const clearSearch = () => {
    setDraftSearch("");
    setSearch("");
    setCursors([]);
  };
  
  const claimTask = (task: WorkQueueRow) => {
    claim.mutate(task, {
      onError: (error) => toast.error(error.message),
      onSuccess: () => toast.success("Task claimed."),
    });
  };
  const emptyMessage = queue.isPending
    ? "Loading your work queue…"
    : queue.isError
      ? queue.error.message
      : "No actionable tasks match these filters.";

  return (
    <PageShell
      eyebrow="Work Queue"
      description="Tasks assigned directly to you or available through one of your roles."
      title="My Work Queue"
    >
      <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm">
        <QueueTabs onChange={changeScope} scope={scope} />
        <div className="p-4">
          <DataTableFilter
            collapsible
            defaultExpanded={false}
            description="Search the tasks assigned to you."
            onApply={applySearch}
            onClear={clearSearch}
            title="Queue filters"
          >
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
              <Input
                aria-label="Search work queue"
                className="pl-10"
                onChange={(event) => setDraftSearch(event.target.value)}
                placeholder="Search reference, applicant, business or task"
                value={draftSearch}
              />
            </div>
          </DataTableFilter>
        </div>
        <WorkQueueTable
          claimingId={claim.isPending ? claim.variables.taskInstanceId : null}
          emptyMessage={emptyMessage}
          items={items}
          onClaim={claimTask}
        />
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
