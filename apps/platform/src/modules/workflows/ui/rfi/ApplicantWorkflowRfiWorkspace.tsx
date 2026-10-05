"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { PageShell } from "@/shared/ui/PageShell";
import type { WorkflowRfiDetail } from "../../domain/runtime/WorkflowRfiView";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import {
  workflowRfiResponseDefinition,
  workflowRfiResponseSchema,
  workflowRfiInitialValues,
} from "./WorkflowRfiResponseForm";
import { useOwnedWorkflowRfi, useRespondToWorkflowRfi } from "./useWorkflowRfi";
import { ApplicantWorkflowRfiDocuments } from "./ApplicantWorkflowRfiDocuments";
import { WorkflowRfiInstructions } from "./WorkflowRfiInstructions";
import {
  WorkflowRfiCorrespondence,
  WorkflowRfiDeadline,
} from "./WorkflowRfiPresentation";

function SubmissionReceipt({ detail }: { detail: WorkflowRfiDetail }) {
  return (
    <section className="rounded-xl border border-brand-green/30 bg-brand-green/10 p-6">
      <CheckCircle2 aria-hidden="true" className="size-8 text-brand-green" />
      <h2 className="mt-3 text-xl font-bold text-brand-navy">
        Response submitted—awaiting review
      </h2>
      <p className="mt-2 text-sm text-brand-navy/70">
        We received your response
        {detail.respondedAt
          ? ` on ${formatLocalDateTime24(detail.respondedAt)}`
          : ""}
      </p>
    </section>
  );
}

function ResponseSubmitButton({
  disabled,
  pending,
}: {
  disabled: boolean;
  pending: boolean;
}) {
  return (
    <div className="flex justify-end">
      <GeneralButton disabled={disabled} type="submit" variant="success">
        {pending ? "Submitting…" : "Submit response"}
      </GeneralButton>
    </div>
  );
}

export function ApplicantWorkflowRfiWorkspace({
  initialDetail,
  canRespond: hasRespondPermission = false,
}: {
  initialDetail: WorkflowRfiDetail;
  canRespond?: boolean;
}) {
  const applicationId = initialDetail.applicationId;
  const query = useOwnedWorkflowRfi(
    applicationId,
    initialDetail.id,
    initialDetail,
  );
  const detail = query.data ?? initialDetail;
  const respond = useRespondToWorkflowRfi(applicationId, detail.id);
  const definition = workflowRfiResponseDefinition(detail);
  const form = useForm<{ fieldValues: Record<string, unknown> }>({
    defaultValues: { fieldValues: workflowRfiInitialValues(detail) },
    resolver: zodResolver(workflowRfiResponseSchema(definition)),
  });
  const fieldValues = useWatch({ control: form.control, name: "fieldValues" });
  const canRespond =
    hasRespondPermission &&
    detail.status === "OPEN" &&
    new Date(detail.deadlineAt) > new Date();
  const missingDocuments = detail.requestedDocuments.filter(
    (document) => !document.evidence,
  );

  async function submitResponse(values: {
    fieldValues: Record<string, unknown>;
  }) {
    if (missingDocuments.length || !canRespond) return;
    await respond.mutateAsync({
      evidenceVersionIds: detail.requestedDocuments.flatMap((document) =>
        document.evidence ? [document.evidence.versionId] : [],
      ),
      expectedRowVersion: detail.rowVersion,
      fieldValues: Object.fromEntries(
        detail.editableFields.map((field) => [
          field.path,
          values.fieldValues[field.path] ?? "",
        ]),
      ),
    });
  }

  const submit = form.handleSubmit(submitResponse);

  return (
    <PageShell
      backLink={
        <GeneralButtonLink
          href={`/portal/applications/${applicationId}`}
          size="compact"
          variant="ghost"
        >
          ← Back to application
        </GeneralButtonLink>
      }
      description={detail.applicationReference}
      title="Request for information"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
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

          {detail.status === "RESPONDED" || detail.status === "CLOSED" ? (
            <SubmissionReceipt detail={detail} />
          ) : null}

          {canRespond ? (
            <FormProvider {...form}>
              <section className="space-y-5">
                {detail.requestedDocuments.length ? (
                  <ApplicantWorkflowRfiDocuments
                    applicationId={applicationId}
                    detail={detail}
                  />
                ) : null}
                {respond.isError ? (
                  <p className="text-sm text-red-700" role="alert">
                    {respond.error.message}
                  </p>
                ) : null}
                {form.formState.errors.fieldValues?.message ? (
                  <p className="text-sm text-red-700" role="alert">
                    {String(form.formState.errors.fieldValues.message)}
                  </p>
                ) : null}
                {detail.editableFields.length ? (
                  <FormRenderer
                    definition={definition}
                    formData={fieldValues}
                    onChange={(values) =>
                      form.setValue("fieldValues", values, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onSubmit={(values) => {
                      form.setValue("fieldValues", values);
                      void submit();
                    }}
                    readOnly={respond.isPending}
                    showCompleteness={false}
                  >
                    <ResponseSubmitButton
                      disabled={
                        Boolean(missingDocuments.length) || respond.isPending
                      }
                      pending={respond.isPending}
                    />
                  </FormRenderer>
                ) : (
                  <form onSubmit={(event) => void submit(event)}>
                    <ResponseSubmitButton
                      disabled={
                        Boolean(missingDocuments.length) || respond.isPending
                      }
                      pending={respond.isPending}
                    />
                  </form>
                )}
              </section>
            </FormProvider>
          ) : detail.status === "OPEN" && !hasRespondPermission ? (
            <p className="rounded-xl border border-brand-navy/10 bg-white p-5 text-sm text-brand-navy/70">
              You have read-only access to this information request.
            </p>
          ) : detail.status === "OPEN" || detail.status === "EXPIRED" ? (
            <p className="rounded-xl border border-brand-navy/10 bg-white p-5 text-sm text-brand-navy/70">
              The response deadline has passed. These fields are locked.
            </p>
          ) : null}
        </div>
        <WorkflowRfiCorrespondence entries={detail.correspondence} />
      </div>
    </PageShell>
  );
}
