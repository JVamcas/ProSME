"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
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
  const deleteMutation = useSaveWorkflowGraph(editor);

  async function deleteAction(action: WorkflowActionDefinition) {
    if (!stage) return;
    await deleteMutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              actions: item.actions
                .filter((current) => current.stableKey !== action.stableKey)
                .map((current, index) => ({
                  ...current,
                  displayOrder: index + 1,
                })),
            }
          : item,
      ),
      transitions: editor.graph.transitions.filter(
        (transition) =>
          transition.sourceStageKey !== stage.stableKey ||
          transition.actionKey !== action.stableKey,
      ),
    });
    onCloseDelete();
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
            Delete <strong>{actionToDelete?.label}</strong> from this stage?
            Its transitions will also be deleted.
          </p>
        }
        onCancel={onCloseDelete}
        onConfirm={() =>
          actionToDelete && void deleteAction(actionToDelete)
        }
        title="Delete workflow action"
      />
    </>
  );
}
