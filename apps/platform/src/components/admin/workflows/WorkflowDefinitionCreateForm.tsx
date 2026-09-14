"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import {
  useCreateWorkflow,
  useUpdateWorkflowDetails,
  useWorkflowEditor,
} from "@/modules/workflows/WorkflowHooks";
import { createWorkflowSchema } from "@/modules/workflows/WorkflowSchemas";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/WorkflowTypes";

type Props = {
  onCompleted?: () => void;
  workflow?: WorkflowDefinitionSummary;
};

function useWorkflowDetailsForm({ onCompleted, workflow }: Props) {
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflowDetails(workflow?.id ?? "");
  const editorQuery = useWorkflowEditor(workflow?.id ?? "", Boolean(workflow));
  const form = useForm<
    z.input<typeof createWorkflowSchema>,
    unknown,
    z.output<typeof createWorkflowSchema>
  >({
    defaultValues: {
      code: workflow?.code ?? "",
      description: workflow?.description ?? "",
      name: workflow?.name ?? "",
      useReferenceWorkflow: true,
    },
    resolver: zodResolver(createWorkflowSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    if (workflow && editorQuery.data) {
      await updateMutation.mutateAsync({
        code: input.code,
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
    isPending:
      createMutation.isPending ||
      updateMutation.isPending ||
      (Boolean(workflow) && editorQuery.isLoading),
    submit,
  };
}

function WorkflowDetailsFields({
  error,
  isEditing,
  isPending,
}: {
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
      {!isEditing ? (
        <CheckboxField
          containerClassName="text-sm text-brand-navy"
          label="Start with the TOR-aligned reference workflow"
          name="useReferenceWorkflow"
        />
      ) : null}
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
          error={state.error}
          isEditing={Boolean(props.workflow)}
          isPending={state.isPending}
        />
      </form>
    </FormProvider>
  );
}
