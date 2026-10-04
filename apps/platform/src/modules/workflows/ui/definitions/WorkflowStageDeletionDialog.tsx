"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import type { WorkflowGraphInput } from "../../domain/definitions/WorkflowTypes";
import {
  inspectWorkflowStageDeletion,
  removeWorkflowStage,
} from "../../domain/definitions/WorkflowStageDeletion";
import {
  workflowStageDeletionDefaults,
  workflowStageDeletionFormSchema,
  type WorkflowStageDeletionFormValues,
} from "./WorkflowStageDeletionFormSchema";
import { WorkflowStageDeletionPreview } from "./WorkflowStageDeletionPreview";

type Props = {
  errorMessage?: string;
  graph: WorkflowGraphInput;
  isPending: boolean;
  onClose: () => void;
  onDelete: (graph: WorkflowGraphInput) => Promise<void>;
  stageKey: string;
};

export function WorkflowStageDeletionDialog({
  errorMessage,
  graph,
  isPending,
  onClose,
  onDelete,
  stageKey,
}: Props) {
  const inspection = inspectWorkflowStageDeletion(graph, stageKey);
  const form = useForm<WorkflowStageDeletionFormValues>({
    defaultValues: workflowStageDeletionDefaults(inspection),
    resolver: zodResolver(workflowStageDeletionFormSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onDelete(
        removeWorkflowStage(graph, stageKey, values.reconnections),
      );
    } catch {
      // The mutation error is rendered in this dialog.
    }
  });

  return (
    <DraggableDialog
      isOpen
      onClose={() => {
        if (!isPending) onClose();
      }}
      size="2xl"
      panelClassName="min-w-0 sm:max-w-4xl"
      contentClassName="min-w-0 overflow-x-hidden p-3 sm:p-6"
      title="Delete workflow stage"
    >
      <FormProvider {...form}>
        <form className="min-w-0 space-y-5" onSubmit={(event) => void submit(event)}>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Delete <strong>{inspection.stage.name}</strong>? The paths shown
            below will be removed. Selected replacement routes will be created
            when you delete the stage.
          </div>
          <WorkflowStageDeletionPreview
            control={form.control}
            disabled={isPending}
            graph={graph}
            inspection={inspection}
          />
          {errorMessage ? (
            <p
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <GeneralButton
              disabled={isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </GeneralButton>
            <GeneralButton disabled={isPending} type="submit" variant="danger">
              {isPending ? "Deleting…" : "Delete stage"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
