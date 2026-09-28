"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect } from "react";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { usePublishedForms } from "@/modules/forms/FormHooks";
import {
  useCreateWorkflow,
  useUpdateWorkflowDetails,
  useWorkflowEditor,
} from "@/modules/workflows/WorkflowHooks";
import { createWorkflowSchema } from "@/modules/workflows/api/WorkflowSchemas";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/domain/definitions/WorkflowTypes";

type Props = {
  onCompleted?: () => void;
  workflow?: WorkflowDefinitionSummary;
};

function useWorkflowDetailsForm({ onCompleted, workflow }: Props) {
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflowDetails(workflow?.id ?? "");
  const editorQuery = useWorkflowEditor(workflow?.id ?? "", Boolean(workflow));
  const publishedForms = usePublishedForms();
  const form = useForm<
    z.input<typeof createWorkflowSchema>,
    unknown,
    z.output<typeof createWorkflowSchema>
  >({
    defaultValues: {
      code: workflow?.code ?? "",
      coiFormVersionId: "",
      description: workflow?.description ?? "",
      name: workflow?.name ?? "",
    },
    resolver: zodResolver(createWorkflowSchema),
  });
  useEffect(() => {
    if (!editorQuery.data) return;
    form.setValue(
      "coiFormVersionId",
      editorQuery.data.version.coiFormVersionId ?? "",
    );
  }, [editorQuery.data, form]);
  const submit = form.handleSubmit(async (input) => {
    if (workflow && editorQuery.data) {
      await updateMutation.mutateAsync({
        code: input.code,
        coiFormVersionId: input.coiFormVersionId,
        description: input.description,
        expectedRowVersion: editorQuery.data.version.rowVersion,
        name: input.name,
      });
    } else if (!workflow) {
      await createMutation.mutateAsync(input);
    } else {
      return;
    }
    form.reset();
    onCompleted?.();
  });
  return {
    error: createMutation.error ?? updateMutation.error ?? editorQuery.error,
    form,
    coiFormOptions: (publishedForms.data ?? [])
      .filter((option) => option.purpose === "COI")
      .map((option) => ({
        label: `${option.formName} — version ${option.versionNumber}`,
        value: option.versionId,
      })),
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      (Boolean(workflow) && editorQuery.isLoading),
    submit,
  };
}

function WorkflowDetailsFields({
  coiFormOptions,
  error,
  isEditing,
  isPending,
}: {
  coiFormOptions: Array<{ label: string; value: string }>;
  error: Error | null;
  isEditing: boolean;
  isPending: boolean;
}) {
  let submitLabel = isEditing ? "Save changes" : "Create workflow";
  if (isPending) submitLabel = isEditing ? "Saving…" : "Creating…";
  return (
    <>
      <FormInput
        label="Workflow code"
        name="code"
        placeholder="SME_STANDARD_GRANT"
      />
      <FormSelect
        containerClassName="md:col-span-2"
        items={coiFormOptions}
        label="Conflict of Interest form version"
        name="coiFormVersionId"
        placeholder="Select a published COI form version"
      />
      <FormInput
        label="Workflow name"
        name="name"
        placeholder="Standard grant workflow"
      />
      <FormTextarea
        containerClassName="md:col-span-2"
        label="Description"
        name="description"
        rows={2}
      />
      <div className="flex items-end justify-end">
        <GeneralButton disabled={isPending} type="submit">
          {submitLabel}
        </GeneralButton>
      </div>
      {error ? (
        <p className="md:col-span-2 text-sm text-brand-navy" role="alert">
          {error.message}
        </p>
      ) : null}
    </>
  );
}

export function WorkflowDefinitionCreateForm(props: Props) {
  const state = useWorkflowDetailsForm(props);
  return (
    <FormProvider {...state.form}>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={state.submit}>
        <WorkflowDetailsFields
          coiFormOptions={state.coiFormOptions}
          error={state.error}
          isEditing={Boolean(props.workflow)}
          isPending={state.isPending}
        />
      </form>
    </FormProvider>
  );
}
