"use client";

import { CalendarDays, FileText } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { useWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import { PageShell } from "@/shared/ui/PageShell";
import { ChecklistTaskForm } from "./ChecklistTaskForm";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function TaskMetadata({
  applicantName,
  businessName,
  dueAt,
  fundingCallTitle,
  reference,
}: {
  applicantName: string;
  businessName: string | null;
  dueAt: string | null;
  fundingCallTitle: string;
  reference: string;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">
          Application
        </p>
        <p className="mt-1 font-semibold text-brand-navy">{reference}</p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">
          Applicant
        </p>
        <p className="mt-1 font-semibold text-brand-navy">
          {businessName ?? applicantName}
        </p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">
          Funding call
        </p>
        <p className="mt-1 inline-flex items-center gap-2 font-semibold text-brand-navy">
          <FileText className="size-4 text-brand-orange" />
          {fundingCallTitle}
        </p>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/45">
          Due date
        </p>
        <p className="mt-1 inline-flex items-center gap-2 font-semibold text-brand-navy">
          <CalendarDays className="size-4 text-brand-orange" />
          {formatDate(dueAt)}
        </p>
      </div>
    </section>
  );
}

export function WorkflowTaskWorkspace({ taskId }: { taskId: string }) {
  const query = useWorkflowTask(taskId);
  if (query.isPending) {
    return <p className="text-sm text-brand-navy/60">Loading task…</p>;
  }
  if (query.isError) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error.message}
      </p>
    );
  }
  const task = query.data;
  return (
    <PageShell
      actions={<StatusBadge status={task.taskStatus} />}
      description="Complete the assigned task using its published form or configured review controls."
      title={task.taskName}
    >
      <div className="space-y-5">
        <TaskMetadata
        applicantName={task.applicantName}
        businessName={task.businessName}
        dueAt={task.dueAt}
        fundingCallTitle={task.fundingCallTitle}
        reference={task.reference}
      />
        {task.formVersionId ? (
          <DynamicFormTask
            actions={task.actions}
            taskId={task.taskInstanceId}
          />
        ) : task.taskType === "CHECKLIST" ? (
          <ChecklistTaskForm task={task} />
        ) : (
          <p className="rounded-xl bg-brand-yellow/30 p-4 text-sm text-brand-navy">
            This legacy task type does not yet have an interactive workspace.
          </p>
        )}
      </div>
    </PageShell>
  );
}
