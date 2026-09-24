"use client";

import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageScoringCriterion } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageScoringCriterionDialog } from "./WorkflowStageScoringCriterionDialog";

export function useWorkflowStageScoringOverlays(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput | undefined,
) {
  const [criterionDialog, setCriterionDialog] = useState<
    "create" | WorkflowStageScoringCriterion | null
  >(null);
  const [criterionToDelete, setCriterionToDelete] =
    useState<WorkflowStageScoringCriterion | null>(null);
  const deleteMutation = useSaveWorkflowGraph(editor);

  async function deleteCriterion(criterion: WorkflowStageScoringCriterion) {
    if (!stage?.scoring) return;
    await deleteMutation.mutateAsync({
      stages: editor.graph.stages.map((currentStage) =>
        currentStage.stableKey === stage.stableKey && currentStage.scoring
          ? {
              ...currentStage,
              scoring: {
                ...currentStage.scoring,
                criteria: currentStage.scoring.criteria.filter(
                  (item) => item.criterion !== criterion.criterion,
                ),
              },
            }
          : currentStage,
      ),
      transitions: editor.graph.transitions,
    });
    setCriterionToDelete(null);
  }

  return {
    onAdd: () => setCriterionDialog("create"),
    onDelete: setCriterionToDelete,
    onEdit: setCriterionDialog,
    overlays: (
      <>
        {criterionDialog && stage ? (
          <WorkflowStageScoringCriterionDialog
            criterion={
              criterionDialog === "create" ? undefined : criterionDialog
            }
            editor={editor}
            onClose={() => setCriterionDialog(null)}
            stage={stage}
          />
        ) : null}
        <ConfirmationDialog
          confirmText="Delete scoring criterion"
          errorMessage={deleteMutation.error?.message}
          isDangerous
          isLoading={deleteMutation.isPending}
          isOpen={criterionToDelete !== null}
          message={
            <p>
              Delete <strong>{criterionToDelete?.criterion}</strong> from this
              stage?
            </p>
          }
          onCancel={() => setCriterionToDelete(null)}
          onConfirm={() =>
            criterionToDelete && void deleteCriterion(criterionToDelete)
          }
          title="Delete scoring criterion"
        />
      </>
    ),
  };
}
