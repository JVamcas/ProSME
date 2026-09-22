"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/components/ui/form-controls";
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

function Pagination({
  canNext,
  canPrevious,
  onNext,
  onPrevious,
  total,
}: {
  canNext: boolean;
  canPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-navy/10 p-4 text-sm text-brand-navy/60">
      <span>{total} actionable {total === 1 ? "task" : "tasks"}</span>
      <div className="flex gap-2">
        <GeneralButton disabled={!canPrevious} onClick={onPrevious} size="sm" variant="outline">
          Previous
        </GeneralButton>
        <GeneralButton disabled={!canNext} onClick={onNext} size="sm" variant="outline">
          Next
        </GeneralButton>
      </div>
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
  const claimTask = (task: WorkQueueRow) => claim.mutate(task);
  const emptyMessage = queue.isPending
    ? "Loading your work queue…"
    : queue.isError
      ? queue.error.message
      : "No actionable tasks match these filters.";

  return (
    <PageShell
      description="Tasks assigned directly to you or available through one of your roles."
      title="My Work Queue"
    >
      <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-sm">
        <QueueTabs onChange={changeScope} scope={scope} />
        <div className="p-4">
          <DataTableFilter
            collapsible
            defaultExpanded
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
        {claim.isError ? (
          <p className="mx-4 mb-4 rounded-xl bg-brand-yellow/30 p-3 text-sm text-brand-navy" role="alert">
            {claim.error.message}
          </p>
        ) : null}
        <WorkQueueTable
          claimingId={claim.isPending ? claim.variables.taskInstanceId : null}
          emptyMessage={emptyMessage}
          items={items}
          onClaim={claimTask}
        />
        <Pagination
          canNext={Boolean(queue.data?.nextCursor)}
          canPrevious={cursors.length > 0}
          onNext={() => {
            if (queue.data?.nextCursor) {
              setCursors((current) => [...current, queue.data!.nextCursor!]);
            }
          }}
          onPrevious={() => setCursors((current) => current.slice(0, -1))}
          total={queue.data?.total ?? 0}
        />
      </section>
    </PageShell>
  );
}
