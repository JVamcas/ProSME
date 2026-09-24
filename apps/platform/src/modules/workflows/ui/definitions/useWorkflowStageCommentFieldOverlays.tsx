"use client";

import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageCommentField } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageCommentFieldDialog } from "./WorkflowStageCommentFieldDialog";

export function useWorkflowStageCommentFieldOverlays(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput | undefined,
) {
  const [dialog, setDialog] = useState<
    "create" | WorkflowStageCommentField | null
  >(null);
  const [toDelete, setToDelete] = useState<WorkflowStageCommentField | null>(null);
  const mutation = useSaveWorkflowGraph(editor);

  async function deleteField(field: WorkflowStageCommentField) {
    if (!stage) return;
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              commentFields: item.commentFields.filter(
                (current) => current.key !== field.key,
              ),
            }
          : item,
      ),
      transitions: editor.graph.transitions,
    });
    setToDelete(null);
  }

  return {
    onAdd: () => setDialog("create"),
    onDelete: setToDelete,
    onEdit: setDialog,
    overlays: (
      <>
        {dialog && stage ? (
          <WorkflowStageCommentFieldDialog
            editor={editor}
            field={dialog === "create" ? undefined : dialog}
            onClose={() => setDialog(null)}
            stage={stage}
          />
        ) : null}
        <ConfirmationDialog
          confirmText="Delete field"
          errorMessage={mutation.error?.message}
          isDangerous
          isLoading={mutation.isPending}
          isOpen={toDelete !== null}
          message={
            <p>
              Delete <strong>{toDelete?.label}</strong> from this stage?
            </p>
          }
          onCancel={() => setToDelete(null)}
          onConfirm={() => toDelete && void deleteField(toDelete)}
          title="Delete comment or recommendation"
        />
      </>
    ),
  };
}
