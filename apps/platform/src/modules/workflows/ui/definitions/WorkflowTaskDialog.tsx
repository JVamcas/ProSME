"use client";

import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useWorkflowTaskDialogController } from "./WorkflowTaskDialogController";
import { WorkflowTaskDialogFields } from "./WorkflowTaskDialogFields";

type Props = {
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
  task?: WorkflowTaskInput;
};

export function WorkflowTaskDialog({
  editor,
  isOpen,
  onClose,
  stage,
  task,
}: Props) {
  const controller = useWorkflowTaskDialogController(editor, stage, task);
  const submit = controller.form.handleSubmit(async (values) => {
    try {
      const saved = await controller.save(values);
      if (saved) onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save the workflow task.",
      );
    }
  });
  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={task ? "Edit workflow task" : "Add workflow task"}
    >
      <FormProvider {...controller.form}>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <WorkflowTaskDialogFields
            assignmentItems={controller.assignmentItems}
            assignmentMode={controller.assignmentMode}
            formItems={controller.formItems}
            formVersionId={controller.formVersionId}
            formsPending={controller.forms.isPending}
            mutationPending={controller.mutation.isPending}
          />
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
