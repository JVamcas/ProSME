"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { useClaimTask, useSelfAssignmentPool } from "../WorkQueueHooks";
import { PageShell } from "@/shared/ui/PageShell";

function dueDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(new Date(value))
    : "No due date";
}

export function SelfAssignmentPoolWorkspace() {
  const [cursors, setCursors] = useState<string[]>([]);
  const pool = useSelfAssignmentPool(cursors.at(-1));
  const claim = useClaimTask();

  return (
    <PageShell
      description="Claim work available to you. Application details open after assignment and any required conflict clearance."
      title="Available tasks"
    >
      <section className="space-y-4">
        {claim.isError ? (
          <p role="alert">{claim.error.message}</p>
        ) : null}
        {pool.isError ? (
          <p role="alert">{pool.error.message}</p>
        ) : null}
        {pool.isPending ? <p>Loading available tasks…</p> : null}
        {pool.data?.items.length === 0 ? (
          <p>No tasks are currently available to claim.</p>
        ) : null}
        <ul className="divide-y rounded-xl border bg-white">
          {pool.data?.items.map((task) => (
            <li className="flex items-center justify-between gap-4 p-4" key={task.taskInstanceId}>
              <div>
                <p className="font-semibold">{task.taskName}</p>
                <p className="text-sm text-brand-navy/60">
                  {task.stageName} · {dueDate(task.dueAt)}
                </p>
              </div>
              <GeneralButton
                disabled={claim.isPending}
                onClick={() => claim.mutate(task)}
                size="sm"
                type="button"
              >
                Claim
              </GeneralButton>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-brand-navy/60">
            {pool.data?.total ?? 0} available tasks
          </span>
          <div className="flex gap-2">
            <GeneralButton
              disabled={cursors.length === 0}
              onClick={() => setCursors((current) => current.slice(0, -1))}
              size="sm"
              type="button"
              variant="outline"
            >
              Previous
            </GeneralButton>
            <GeneralButton
              disabled={!pool.data?.nextCursor}
              onClick={() => {
                if (pool.data?.nextCursor) {
                  setCursors((current) => [...current, pool.data!.nextCursor!]);
                }
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Next
            </GeneralButton>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
