"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import {
  useCloseWorkflowRfi,
  useFollowUpWorkflowRfi,
  useTaskWorkflowRfi,
  useTaskWorkflowRfis,
} from "./WorkflowRfiHooks";
import { WorkflowRfiInstructions } from "./WorkflowRfiInstructions";
import {
  WorkflowRfiCorrespondence,
  WorkflowRfiDeadline,
} from "./WorkflowRfiPresentation";

const followUpSchema = z.object({
  message: z.string().trim().min(1, "Enter a follow-up message.").max(4_000),
});
type FollowUpValues = z.infer<typeof followUpSchema>;

function StaffRfiResponse({
  detail,
  taskId,
}: {
  detail: WorkflowRfiDetail;
  taskId: string;
}) {
  if (!detail.response) {
    return (
      <p className="rounded-lg bg-brand-navy/[0.04] p-4 text-sm text-brand-navy/65">
        Awaiting the applicant&apos;s response.
      </p>
    );
  }
  return (
    <section className="rounded-xl border border-brand-green/25 bg-brand-green/10 p-5">
      <h3 className="font-bold text-brand-navy">Applicant response</h3>
      <p className="mt-1 text-xs text-brand-navy/60">
        Received {formatLocalDateTime24(detail.response.respondedAt)}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {detail.editableFields.map((field) => (
          <div key={field.path}>
            <dt className="text-xs text-brand-navy/60">{field.label}</dt>
            <dd className="mt-1 text-sm font-medium text-brand-navy">
              {Array.isArray(detail.response!.fieldValues[field.path])
                ? (detail.response!.fieldValues[field.path] as unknown[]).join(
                    ", ",
                  )
                : String(detail.response!.fieldValues[field.path] ?? "—")}
            </dd>
          </div>
        ))}
      </dl>
      {detail.requestedDocuments.length ? (
        <ul className="mt-4 space-y-2">
          {detail.requestedDocuments.map((document) => (
            <li
              className="text-sm text-brand-navy"
              key={document.requirementId}
            >
              <FileText
                aria-hidden="true"
                className="size-4 text-brand-orange"
              />
              <span className="ml-2">{document.name}: </span>
              {document.evidence ? (
                <a
                  className="font-semibold text-brand-green underline-offset-2 hover:underline"
                  href={`/api/admin/tasks/${taskId}/documents/${document.evidence.versionId}/download`}
                >
                  {document.evidence.fileName}
                </a>
              ) : (
                "Not supplied"
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function FollowUpForm({
  detail,
  taskId,
}: {
  detail: WorkflowRfiDetail;
  taskId: string;
}) {
  const followUp = useFollowUpWorkflowRfi(taskId, detail.id);
  const form = useForm<FollowUpValues>({
    defaultValues: { message: "" },
    resolver: zodResolver(followUpSchema),
  });
  const submit = form.handleSubmit(async ({ message }) => {
    await followUp.mutateAsync(message);
    form.reset();
  });
  return (
    <FormProvider {...form}>
      <form
        className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm"
        onSubmit={(event) => void submit(event)}
      >
        <FormTextarea
          label="Follow up with the applicant"
          name="message"
          rows={3}
        />
        {followUp.isError ? (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {followUp.error.message}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end">
          <GeneralButton disabled={followUp.isPending} type="submit">
            {followUp.isPending ? "Sending…" : "Send follow-up"}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}

function StaffRfiDetail({
  detail,
  taskId,
}: {
  detail: WorkflowRfiDetail;
  taskId: string;
}) {
  const close = useCloseWorkflowRfi(taskId, detail.id);
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-orange/25 bg-brand-cream p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge status={detail.status} />
          <WorkflowRfiDeadline
            deadlineAt={detail.deadlineAt}
            isOverdue={detail.isOverdue}
            status={detail.status}
          />
        </div>
        <WorkflowRfiInstructions
          instructions={detail.instructions}
          question={detail.question}
        />
      </section>
      <StaffRfiResponse detail={detail} taskId={taskId} />
      <WorkflowRfiCorrespondence entries={detail.correspondence} />
      {detail.status === "OPEN" ? (
        <FollowUpForm detail={detail} taskId={taskId} />
      ) : null}
      {detail.status === "OPEN" || detail.status === "RESPONDED" ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {close.isError ? (
            <p className="text-sm text-red-700" role="alert">
              {close.error.message}
            </p>
          ) : null}
          <GeneralButton
            disabled={close.isPending}
            onClick={() => close.mutate(detail.rowVersion)}
            variant={detail.status === "RESPONDED" ? "success" : "outline"}
          >
            {close.isPending
              ? "Closing…"
              : detail.status === "RESPONDED"
                ? "Accept response and close"
                : "Close request"}
          </GeneralButton>
        </div>
      ) : null}
    </div>
  );
}

export function WorkflowTaskRfiPanel({ taskId }: { taskId: string }) {
  const list = useTaskWorkflowRfis(taskId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const effectiveSelectedId = selectedId ?? list.data?.[0]?.id ?? null;
  const detail = useTaskWorkflowRfi(taskId, effectiveSelectedId);

  if (list.isPending) {
    return (
      <PortalLoadingState
        description="Loading information requests."
        title="Preparing RFI history"
      />
    );
  }
  if (list.isError) {
    return (
      <PortalErrorState
        description={list.error.message}
        onAction={() => void list.refetch()}
        title="Information requests could not be loaded"
      />
    );
  }
  if (!list.data.length) {
    return (
      <section className="rounded-xl border border-brand-navy/10 bg-white p-6 text-center">
        <h2 className="font-bold text-brand-navy">No information requests</h2>
        <p className="mt-2 text-sm text-brand-navy/60">
          Use an available Request Information task action to contact the
          applicant.
        </p>
      </section>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <nav aria-label="Task information requests" className="space-y-2">
        {list.data.map((request) => (
          <button
            className={
              effectiveSelectedId === request.id
                ? "w-full rounded-xl border border-brand-orange bg-brand-cream p-4 text-left"
                : "w-full rounded-xl border border-brand-navy/10 bg-white p-4 text-left hover:border-brand-orange/40"
            }
            key={request.id}
            onClick={() => setSelectedId(request.id)}
            type="button"
          >
            <StatusBadge status={request.status} />
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-brand-navy">
              {request.question}
            </p>
            <p className="mt-2 text-xs text-brand-navy/60">
              {formatLocalDateTime24(request.createdAt)}
            </p>
          </button>
        ))}
      </nav>
      {detail.isPending ? (
        <PortalLoadingState
          description="Loading the selected request."
          title="Preparing request"
        />
      ) : detail.isError ? (
        <PortalErrorState
          description={detail.error.message}
          onAction={() => void detail.refetch()}
          title="Request could not be loaded"
        />
      ) : detail.data ? (
        <StaffRfiDetail detail={detail.data} taskId={taskId} />
      ) : null}
    </div>
  );
}
