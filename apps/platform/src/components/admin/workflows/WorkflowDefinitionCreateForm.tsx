"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

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
import type { z } from "zod";

export function WorkflowDefinitionCreateForm({
  onCompleted,
  workflow,
}: {
  onCompleted?: () => void;
  workflow?: WorkflowDefinitionSummary;
}) {
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflowDetails(workflow?.id ?? "");
  const editorQuery = useWorkflowEditor(workflow?.id ?? "", Boolean(workflow));
  const isEditing = Boolean(workflow);
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
    if (workflow) {
      if (!editorQuery.data) return;
      await updateMutation.mutateAsync({
        code: input.code,
        description: input.description,
        expectedRowVersion: editorQuery.data.version.rowVersion,
        name: input.name,
      });
    } else {
      await createMutation.mutateAsync(input);
    }
    form.reset();
    onCompleted?.();
  });
  const error = createMutation.error ?? updateMutation.error ?? editorQuery.error;
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    (isEditing && editorQuery.isLoading);

  return (
    <FormProvider {...form}>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
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
            {isPending
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
                ? "Save changes"
                : "Create workflow"}
          </GeneralButton>
        </div>
        {error ? (
          <p className="md:col-span-2 text-sm text-brand-navy" role="alert">
            {error.message}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}
