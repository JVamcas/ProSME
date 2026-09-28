"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { z } from "zod";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { PageShell } from "@/shared/ui/PageShell";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type {
  WorkflowRfiDetail,
  WorkflowRfiEditableField,
} from "../../domain/runtime/WorkflowRfiView";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";
import {
  useOwnedWorkflowRfi,
  useRespondToWorkflowRfi,
} from "./WorkflowRfiHooks";
import { ApplicantWorkflowRfiDocuments } from "./ApplicantWorkflowRfiDocuments";
import { WorkflowRfiInstructions } from "./WorkflowRfiInstructions";
import {
  WorkflowRfiCorrespondence,
  WorkflowRfiDeadline,
} from "./WorkflowRfiPresentation";

const fieldValueSchema = z.union([z.string(), z.array(z.string())]);
const responseFormSchema = z.object({
  fields: z.array(
    z.object({
      path: z.string().min(1),
      value: fieldValueSchema,
    }),
  ),
}).superRefine((values, context) => {
  values.fields.forEach((field, index) => {
    if (
      field.path === workflowRfiDetailedResponseFieldPath &&
      (typeof field.value !== "string" || !richTextToPlainText(field.value))
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter the requested detailed response.",
        path: ["fields", index, "value"],
      });
    }
  });
});
type ResponseFormValues = z.infer<typeof responseFormSchema>;

function initialValue(
  field: WorkflowRfiEditableField,
  detail: WorkflowRfiDetail,
) {
  const value = Object.hasOwn(detail.draft?.fieldValues ?? {}, field.path)
    ? detail.draft!.fieldValues[field.path]
    : field.currentValue;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "boolean") return value ? "true" : "false";
  return value === null || value === undefined ? "" : String(value);
}

function submittedValues(
  values: ResponseFormValues,
  fields: WorkflowRfiEditableField[],
) {
  const types = new Map(fields.map((field) => [field.path, field.type]));
  return Object.fromEntries(
    values.fields.map((field) => {
      const type = types.get(field.path);
      if (type === "YES_NO") return [field.path, field.value === "true"];
      if (
        ["NUMBER", "CURRENCY", "PERCENTAGE"].includes(type ?? "") &&
        typeof field.value === "string" &&
        field.value !== ""
      ) {
        return [field.path, Number(field.value)];
      }
      return [field.path, field.value];
    }),
  );
}

function EditableFieldControl({
  field,
  index,
}: {
  field: WorkflowRfiEditableField;
  index: number;
}) {
  const name = `fields.${index}.value` as const;
  if (field.type === "RICH_TEXT") {
    return (
      <FormRichTextField
        label={field.label}
        name={name}
        placeholder="Provide the requested detailed information."
        required
      />
    );
  }
  if (field.type === "TEXTAREA") {
    return <FormTextarea label={field.label} name={name} rows={4} />;
  }
  if (field.type === "YES_NO") {
    return (
      <FormSelect
        items={[
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ]}
        label={field.label}
        name={name}
        placeholder="Select an answer"
      />
    );
  }
  if (field.type === "SINGLE_SELECT") {
    return (
      <FormSelect
        items={field.options.map((option) => ({
          label: option.label,
          value: option.key,
        }))}
        label={field.label}
        name={name}
        placeholder="Select an option"
      />
    );
  }
  if (field.type === "MULTI_SELECT") {
    return <MultiSelectField field={field} index={index} />;
  }
  return (
    <FormInput
      label={field.label}
      name={name}
      type={
        ["NUMBER", "CURRENCY", "PERCENTAGE"].includes(field.type)
          ? "number"
          : field.type === "DATE"
            ? "date"
            : "text"
      }
    />
  );
}

function MultiSelectField({
  field,
  index,
}: {
  field: WorkflowRfiEditableField;
  index: number;
}) {
  const name = `fields.${index}.value` as const;
  const form = useFormContext<ResponseFormValues>();
  const values = useWatch<ResponseFormValues>({ name }) as string[] | undefined;
  return (
    <FormSelect
      items={field.options.map((option) => ({
        label: option.label,
        value: option.key,
      }))}
      label={field.label}
      multiple
      name={name}
      onMultipleChange={(next) =>
        form.setValue(name, next, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
      value={values ?? []}
    />
  );
}

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

export function ApplicantWorkflowRfiWorkspace({
  initialDetail,
}: {
  initialDetail: WorkflowRfiDetail;
}) {
  const applicationId = initialDetail.applicationId;
  const query = useOwnedWorkflowRfi(
    applicationId,
    initialDetail.id,
    initialDetail,
  );
  const detail = query.data ?? initialDetail;
  const respond = useRespondToWorkflowRfi(applicationId, detail.id);
  const form = useForm<ResponseFormValues>({
    defaultValues: {
      fields: detail.editableFields.map((field) => ({
        path: field.path,
        value: initialValue(field, detail),
      })),
    },
    resolver: zodResolver(responseFormSchema),
  });
  const missingDocuments = detail.requestedDocuments.filter(
    (document) => !document.evidence,
  );

  async function submitResponse(values: ResponseFormValues) {
    if (missingDocuments.length) return;
    await respond.mutateAsync({
      evidenceVersionIds: detail.requestedDocuments.flatMap((document) =>
        document.evidence ? [document.evidence.versionId] : [],
      ),
      expectedRowVersion: detail.rowVersion,
      fieldValues: submittedValues(values, detail.editableFields),
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

          {detail.status === "OPEN" ? (
            <FormProvider {...form}>
              <form
                className="space-y-5"
                onSubmit={(event) => void submit(event)}
              >
                {detail.editableFields.length ? (
                  <section className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm">
                    <h2 className="font-bold text-brand-navy">
                      Information to update
                    </h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {detail.editableFields.map((field, index) => (
                        <div key={field.path}>
                          <input
                            {...form.register(`fields.${index}.path`)}
                            type="hidden"
                          />
                          <EditableFieldControl field={field} index={index} />
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
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
                <div className="flex flex-wrap justify-end gap-3">
                  <GeneralButton
                    disabled={
                      Boolean(missingDocuments.length) || respond.isPending
                    }
                    type="submit"
                    variant="success"
                  >
                    {respond.isPending ? "Submitting…" : "Submit response"}
                  </GeneralButton>
                </div>
              </form>
            </FormProvider>
          ) : null}
        </div>
        <WorkflowRfiCorrespondence entries={detail.correspondence} />
      </div>
    </PageShell>
  );
}
