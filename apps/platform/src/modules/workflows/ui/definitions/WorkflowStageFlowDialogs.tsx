import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { WorkflowStageDialog } from "@/modules/workflows/ui/definitions/WorkflowStageDialog";
import { WorkflowTaskDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskDialog";
import { WorkflowTaskPreviewDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { WorkflowActionOverlays } from "@/modules/workflows/ui/definitions/WorkflowActionOverlays";
import { WorkflowStageChecklistDialog } from "@/modules/workflows/ui/definitions/WorkflowStageChecklistDialog";
import { WorkflowStageDocumentRequirementDialog } from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementDialog";
import { WorkflowStageDeletionDialog } from "@/modules/workflows/ui/definitions/WorkflowStageDeletionDialog";
import type { WorkflowStageFlowViewModel } from "./WorkflowStageFlow";

export function WorkflowStageFlowDialogs({
  view,
}: {
  view: WorkflowStageFlowViewModel;
}) {
  const {
    setSelectedCode,
    stageDialog,
    setStageDialog,
    stageToDelete,
    setStageToDelete,
    actionDialog,
    setActionDialog,
    actionToDelete,
    setActionToDelete,
    taskDialog,
    setTaskDialog,
    taskToDelete,
    setTaskToDelete,
    taskToPreview,
    setTaskToPreview,
    checklistDialog,
    setChecklistDialog,
    checklistItemToDelete,
    setChecklistItemToDelete,
    documentRequirementDialog,
    setDocumentRequirementDialog,
    documentRequirementToDelete,
    setDocumentRequirementToDelete,
    deleteMutation,
    taskDeleteMutation,
    checklistDeleteMutation,
    documentRequirementDeleteMutation,
    selectedStage,
    commentOverlays,
    scoringOverlays,
    editor,
    deleteStage,
    deleteTask,
    deleteChecklistItem,
    deleteDocumentRequirement,
  } = view;
  return (
    <>
      {stageDialog ? (
        <WorkflowStageDialog
          editor={editor}
          isOpen
          onClose={() => setStageDialog(null)}
          onCreated={setSelectedCode}
          stage={stageDialog === "create" ? undefined : stageDialog}
        />
      ) : null}
      {taskDialog && selectedStage ? (
        <WorkflowTaskDialog
          editor={editor}
          isOpen
          onClose={() => setTaskDialog(null)}
          stage={selectedStage}
          task={taskDialog === "create" ? undefined : taskDialog}
        />
      ) : null}
      {taskToPreview && selectedStage ? (
        <WorkflowTaskPreviewDialog
          definitionId={editor.definition.id}
          onClose={() => setTaskToPreview(null)}
          stage={selectedStage}
          task={taskToPreview}
          versionId={editor.version.id}
        />
      ) : null}
      {checklistDialog && selectedStage ? (
        <WorkflowStageChecklistDialog
          checklistItem={
            checklistDialog === "create" ? undefined : checklistDialog
          }
          editor={editor}
          onClose={() => setChecklistDialog(null)}
          stage={selectedStage}
        />
      ) : null}
      {documentRequirementDialog && selectedStage ? (
        <WorkflowStageDocumentRequirementDialog
          editor={editor}
          onClose={() => setDocumentRequirementDialog(null)}
          requirement={
            documentRequirementDialog === "create"
              ? undefined
              : documentRequirementDialog
          }
          stage={selectedStage}
        />
      ) : null}
      {scoringOverlays.overlays}
      {commentOverlays.overlays}
      <WorkflowActionOverlays
        actionDialog={actionDialog}
        actionToDelete={actionToDelete}
        editor={editor}
        onCloseDelete={() => setActionToDelete(null)}
        onCloseDialog={() => setActionDialog(null)}
        stage={selectedStage}
      />
      {stageToDelete ? (
        <WorkflowStageDeletionDialog
          errorMessage={deleteMutation.error?.message}
          graph={editor.graph}
          isPending={deleteMutation.isPending}
          onClose={() => setStageToDelete(null)}
          onDelete={deleteStage}
          stageKey={stageToDelete.stableKey}
        />
      ) : null}
      <ConfirmationDialog
        confirmText="Delete document requirement"
        errorMessage={documentRequirementDeleteMutation.error?.message}
        isDangerous
        isLoading={documentRequirementDeleteMutation.isPending}
        isOpen={documentRequirementToDelete !== null}
        message={
          <p>
            Delete <strong>{documentRequirementToDelete?.name}</strong> from
            this stage?
          </p>
        }
        onCancel={() => setDocumentRequirementToDelete(null)}
        onConfirm={() =>
          documentRequirementToDelete
          && void deleteDocumentRequirement(documentRequirementToDelete)
        }
        title="Delete document requirement"
      />
      <ConfirmationDialog
        confirmText="Delete checklist item"
        errorMessage={checklistDeleteMutation.error?.message}
        isDangerous
        isLoading={checklistDeleteMutation.isPending}
        isOpen={checklistItemToDelete !== null}
        message={
          <p>
            Delete checklist item <strong>{checklistItemToDelete?.key}</strong>?
          </p>
        }
        onCancel={() => setChecklistItemToDelete(null)}
        onConfirm={() =>
          checklistItemToDelete
          && void deleteChecklistItem(checklistItemToDelete)
        }
        title="Delete checklist item"
      />
      <ConfirmationDialog
        confirmText="Delete task"
        errorMessage={taskDeleteMutation.error?.message}
        isDangerous
        isLoading={taskDeleteMutation.isPending}
        isOpen={taskToDelete !== null}
        message={
          <p>
            Delete <strong>{taskToDelete?.name}</strong>? Any transition
            condition that uses this task will be cleared.
          </p>
        }
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => taskToDelete && void deleteTask(taskToDelete)}
        title="Delete workflow task"
      />
    </>
  );
}
