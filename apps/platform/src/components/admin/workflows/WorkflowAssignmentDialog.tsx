"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { GeneralButton } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-fields";
import {
  useAssignWorkflow,
  usePublishedWorkflows,
  useWorkflowAssignments,
  useWorkflowOpportunities,
} from "@/modules/workflows/WorkflowHooks";
import type { WorkflowDefinitionSummary } from "@/modules/workflows/WorkflowTypes";

const assignmentSelectionSchema = z.object({
  fundingOpportunityId: z.coerce.number().int().positive(),
});

type Props = {
  onClose: () => void;
  workflow: WorkflowDefinitionSummary;
};

function useWorkflowAssignmentForm({ onClose, workflow }: Props) {
  const assignments = useWorkflowAssignments();
  const opportunities = useWorkflowOpportunities();
  const workflows = usePublishedWorkflows();
  const mutation = useAssignWorkflow();
  const form = useForm<
    z.input<typeof assignmentSelectionSchema>,
    unknown,
    z.output<typeof assignmentSelectionSchema>
  >({ resolver: zodResolver(assignmentSelectionSchema) });
  const published = workflows.data?.find(
    (item) => item.definitionId === workflow.id,
  );
  const loading =
    assignments.isLoading || opportunities.isLoading || workflows.isLoading;
  const submit = form.handleSubmit(async ({ fundingOpportunityId }) => {
    if (!published) return;
    const current = assignments.data?.find(
      (item) => item.fundingOpportunityId === fundingOpportunityId,
    );
    const opportunity = opportunities.data?.items.find(
      (item) => item.id === fundingOpportunityId,
    );
    await mutation.mutateAsync({
      expectedRowVersion: current?.rowVersion ?? 0,
      fundingOpportunityId,
      fundingOpportunityTitle: opportunity?.title ?? "Funding opportunity",
      workflowVersionId: published.versionId,
    });
    onClose();
  });
  return { form, loading, mutation, opportunities, published, submit };
}

function WorkflowAssignmentForm(props: Props) {
  const state = useWorkflowAssignmentForm(props);

  if (state.loading) return <p>Loading assignment options…</p>;
  if (!state.published) {
    return <p>This workflow does not have a published version to assign.</p>;
  }
  return (
    <FormProvider {...state.form}>
      <form className="grid gap-4" onSubmit={state.submit}>
        <div className="rounded-xl bg-brand-cream p-4 text-sm text-brand-navy">
          <strong>{props.workflow.name}</strong>
          <span className="ml-2 text-brand-navy/60">
            Published version {state.published.versionNumber}
          </span>
        </div>
        <FormSelect
          items={(state.opportunities.data?.items ?? []).map((item) => ({
            label: item.title,
            value: item.id,
          }))}
          label="Funding opportunity"
          name="fundingOpportunityId"
          placeholder="Select a funding opportunity"
        />
        <GeneralButton disabled={state.mutation.isPending} type="submit">
          {state.mutation.isPending ? "Assigning…" : "Assign funding"}
        </GeneralButton>
        {state.mutation.error ? (
          <p className="text-sm text-brand-navy" role="alert">
            {state.mutation.error.message}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}

export function WorkflowAssignmentDialog({ onClose, workflow }: Props) {
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      size="md"
      title="Assign funding opportunity"
    >
      <WorkflowAssignmentForm onClose={onClose} workflow={workflow} />
    </DraggableDialog>
  );
}
