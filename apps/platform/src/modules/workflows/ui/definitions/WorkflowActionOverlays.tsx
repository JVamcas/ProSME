"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useDeleteWorkflowAction } from "./useDeleteWorkflowAction";
import { WorkflowActionDialog } from "./WorkflowActionDialog";

type Props = {
  actionDialog: "create" | WorkflowActionDefinition | null;
  actionToDelete: WorkflowActionDefinition | null;
  editor: WorkflowEditorView;
  onCloseDialog: () => void;
  onCloseDelete: () => void;
  stage?: WorkflowStageInput;
};

export function WorkflowActionOverlays({
  actionDialog,
  actionToDelete,
  editor,
  onCloseDialog,
  onCloseDelete,
  stage,
}: Props) {
  const deleteMutation = useDeleteWorkflowAction(editor);

  async function deleteAction(action: WorkflowActionDefinition) {
    if (!stage) return;
    try {
      await deleteMutation.mutateAsync({
        stageKey: stage.stableKey,
        actionKey: action.stableKey,
      });
      onCloseDelete();
    } catch {
      // Keep the confirmation open; the mutation displays the server error.
    }
  }

  return (
    <>
      {actionDialog && stage ? (
        <WorkflowActionDialog
          action={actionDialog === "create" ? undefined : actionDialog}
          editor={editor}
          isOpen
          onClose={onCloseDialog}
          stage={stage}
        />
      ) : null}
      <ConfirmationDialog
        confirmText="Delete action"
        errorMessage={deleteMutation.error?.message}
        isDangerous
        isLoading={deleteMutation.isPending}
        isOpen={actionToDelete !== null}
        message={
          <p>
            Delete <strong>{actionToDelete?.label}</strong> from this stage? Its
            transitions and Task bindings will also be deleted.
          </p>
        }
        onCancel={onCloseDelete}
        onConfirm={() => actionToDelete && void deleteAction(actionToDelete)}
        title="Delete workflow action"
      />
    </>
  );
}
