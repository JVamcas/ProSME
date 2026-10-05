"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import {
  useCloseWorkflowRfi,
  useFollowUpWorkflowRfi,
  useTaskWorkflowRfi,
  useTaskWorkflowRfis,
} from "./useWorkflowRfi";
import { WorkflowRfiInstructions } from "./WorkflowRfiInstructions";
import {
  WorkflowRfiCorrespondence,
  WorkflowRfiDeadline,
} from "./WorkflowRfiPresentation";
import { WorkflowRfiRequestListItem } from "./WorkflowRfiRequestList";

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
              {field.type === "RICH_TEXT" ? (
                <SanitizedRichTextContent
                  sanitizedHtml={String(
                    detail.response!.fieldValues[field.path] ?? "",
                  )}
                />
              ) : Array.isArray(detail.response!.fieldValues[field.path]) ? (
                (detail.response!.fieldValues[field.path] as unknown[]).join(
                  ", ",
                )
              ) : (
                String(detail.response!.fieldValues[field.path] ?? "—")
              )}
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
                  download
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
  canClose,
  canFollowUp,
}: {
  detail: WorkflowRfiDetail;
  taskId: string;
  canClose: boolean;
  canFollowUp: boolean;
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
      {canFollowUp && detail.status === "OPEN" ? (
        <FollowUpForm detail={detail} taskId={taskId} />
      ) : null}
      {canClose &&
      (detail.status === "OPEN" || detail.status === "RESPONDED") ? (
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

export function WorkflowTaskRfiPanel({
  taskId,
  initialRequestId,
  canClose = false,
  canFollowUp = false,
}: {
  taskId: string;
  initialRequestId?: string;
  canClose?: boolean;
  canFollowUp?: boolean;
}) {
  const list = useTaskWorkflowRfis(taskId);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRequestId ?? null,
  );
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

  const pendingCount = list.data.filter(
    (request) => request.status === "OPEN",
  ).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white p-4 shadow-sm sm:p-6">
      <header className="flex flex-col gap-4 border-b border-brand-navy/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <MessageSquareText aria-hidden="true" className="size-7" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Information Requests
            </h2>
            <p className="mt-1 text-sm text-brand-navy/60">
              Questions sent to the applicant during this review.
            </p>
          </div>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-navy/[0.04] py-1.5 pl-1.5 pr-4 text-sm font-semibold text-brand-navy/75">
          <span className="grid size-8 place-items-center rounded-full bg-brand-blue/15 font-bold text-brand-navy">
            {pendingCount}
          </span>
          Awaiting response
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.4fr)]">
        <nav aria-label="Task information requests" className="space-y-3">
          {list.data.map((request) => (
            <WorkflowRfiRequestListItem
              isSelected={effectiveSelectedId === request.id}
              key={request.id}
              onSelect={() => setSelectedId(request.id)}
              request={request}
            />
          ))}
        </nav>

        <div className="min-w-0">
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
            <StaffRfiDetail
              canClose={canClose}
              canFollowUp={canFollowUp}
              detail={detail.data}
              taskId={taskId}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
