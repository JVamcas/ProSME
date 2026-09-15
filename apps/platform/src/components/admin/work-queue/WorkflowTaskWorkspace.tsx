"use client";

import { CalendarDays, FileText } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import { ChecklistTaskForm } from "./ChecklistTaskForm";

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function WorkflowTaskWorkspace({ taskId }: { taskId: string }) {
  const query = useWorkflowTask(taskId);
  if (query.isPending) {
    return <p className="text-sm text-brand-navy/60">Loading task…</p>;
  }
  if (query.isError) {
    return <p className="text-sm text-red-700" role="alert">{query.error.message}</p>;
  }
  const task = query.data;
  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-brand-navy">{task.taskName}</h1>
          <StatusBadge status={task.taskStatus} />
        </div>
        <p className="mt-1 text-sm text-brand-navy/60">
          Complete the checklist configured in the assigned published workflow.
        </p>
      </header>
      <section className="grid gap-4 rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">Application</p>
          <p className="mt-1 font-semibold text-brand-navy">{task.reference}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">Applicant</p>
          <p className="mt-1 font-semibold text-brand-navy">{task.businessName ?? task.applicantName}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">Funding call</p>
          <p className="mt-1 inline-flex items-center gap-2 font-semibold text-brand-navy">
            <FileText className="size-4 text-brand-orange" /> {task.fundingCallTitle}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">Due date</p>
          <p className="mt-1 inline-flex items-center gap-2 font-semibold text-brand-navy">
            <CalendarDays className="size-4 text-brand-orange" /> {formatDate(task.dueAt)}
          </p>
        </div>
      </section>
      {task.taskType === "CHECKLIST" ? (
        <ChecklistTaskForm task={task} />
      ) : (
        <p className="rounded-xl bg-brand-yellow/30 p-4 text-sm text-brand-navy">
          This task type does not yet have an interactive workspace.
        </p>
      )}
    </div>
  );
}
