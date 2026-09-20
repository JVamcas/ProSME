"use client";

import { useMemo, useState } from "react";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageCreateDialog } from "./WorkflowStageCreateDialog";
import { WorkflowStageDetails } from "./WorkflowStageDetails";
import { WorkflowTaskDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskDialog";
import { WorkflowTaskPreviewDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { WorkflowActionOverlays } from "@/modules/workflows/ui/definitions/WorkflowActionOverlays";
import { WorkflowStageChecklistDialog } from "@/modules/workflows/ui/definitions/WorkflowStageChecklistDialog";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import { WorkflowStageDocumentRequirementDialog } from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementDialog";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import { useWorkflowStageScoringOverlays } from "@/modules/workflows/ui/definitions/useWorkflowStageScoringOverlays";
import { useWorkflowStageCommentFieldOverlays } from "@/modules/workflows/ui/definitions/useWorkflowStageCommentFieldOverlays";
import {
  WorkflowFlowPreview,
  WorkflowFlowToolbar,
  WorkflowStageList,
  WorkflowStagesHeader,
} from "./WorkflowStageFlowParts";

type Props = {
  canEdit: boolean;
  editor: WorkflowEditorView;
};

export function WorkflowStageFlow({ canEdit, editor }: Props) {
  const stages = useMemo(
    () =>
      [...editor.graph.stages].sort(
        (left, right) => left.displayOrder - right.displayOrder,
      ),
    [editor.graph.stages],
  );
  const [selectedCode, setSelectedCode] = useState(
    stages[0]?.stableKey ?? "",
  );
  const [showVisualFlow, setShowVisualFlow] = useState(false);
  const [stageDialog, setStageDialog] = useState<
    "create" | WorkflowStageInput | null
  >(null);
  const [stageToDelete, setStageToDelete] = useState<WorkflowStageInput | null>(
    null,
  );
  const [actionDialog, setActionDialog] = useState<
    "create" | WorkflowActionDefinition | null
  >(null);
  const [actionToDelete, setActionToDelete] =
    useState<WorkflowActionDefinition | null>(null);
  const [taskDialog, setTaskDialog] = useState<
    "create" | WorkflowTaskInput | null
  >(null);
  const [taskToDelete, setTaskToDelete] = useState<WorkflowTaskInput | null>(
    null,
  );
  const [taskToPreview, setTaskToPreview] = useState<WorkflowTaskInput | null>(
    null,
  );
  const [checklistDialog, setChecklistDialog] = useState<
    "create" | WorkflowStageChecklistDefinition | null
  >(null);
  const [checklistItemToDelete, setChecklistItemToDelete] =
    useState<WorkflowStageChecklistDefinition | null>(null);
  const [documentRequirementDialog, setDocumentRequirementDialog] = useState<
    "create" | WorkflowStageDocumentRequirement | null
  >(null);
  const [documentRequirementToDelete, setDocumentRequirementToDelete] =
    useState<WorkflowStageDocumentRequirement | null>(null);
  const deleteMutation = useSaveWorkflowGraph(editor);
  const taskDeleteMutation = useSaveWorkflowGraph(editor);
  const checklistDeleteMutation = useSaveWorkflowGraph(editor);
  const documentRequirementDeleteMutation = useSaveWorkflowGraph(editor);
  const isEditingLocked = !canEdit;

  const selectedStage =
    stages.find((stage) => stage.stableKey === selectedCode) ?? stages[0];
  const selectedIndex = selectedStage
    ? stages.findIndex((stage) => stage.stableKey === selectedStage.stableKey)
    : -1;
  const scoringOverlays = useWorkflowStageScoringOverlays(
    editor,
    selectedStage,
  );
  const commentFieldOverlays = useWorkflowStageCommentFieldOverlays(
    editor,
    selectedStage,
  );

  async function deleteStage(stage: WorkflowStageInput) {
    if (stages.length <= 1) return;
    const successor = stages[selectedIndex + 1]?.stableKey;
    const remaining = stages
      .filter((item) => item.stableKey !== stage.stableKey)
      .map((item, index) => ({
        ...item,
        initial: index === 0,
        displayOrder: index + 1,
      }));
    await deleteMutation.mutateAsync({
      stages: remaining,
      transitions: editor.graph.transitions
        .filter(
          (transition) => transition.sourceStageKey !== stage.stableKey,
        )
        .flatMap((transition) =>
          transition.targetStageKey !== stage.stableKey
            ? [transition]
            : successor
              ? [{ ...transition, targetStageKey: successor }]
              : [],
        ),
    });
    setSelectedCode(
      remaining[Math.min(selectedIndex, remaining.length - 1)].stableKey,
    );
    setStageToDelete(null);
  }

  async function deleteTask(task: WorkflowTaskInput) {
    if (!selectedStage) return;
    await taskDeleteMutation.mutateAsync({
      stages: editor.graph.stages.map((stage) =>
        stage.stableKey === selectedStage.stableKey
          ? {
              ...stage,
              tasks: stage.tasks
                .filter((item) => item.stableKey !== task.stableKey)
                .map((item, index) => ({ ...item, displayOrder: index + 1 })),
            }
          : stage,
      ),
      transitions: editor.graph.transitions,
    });
    setTaskToDelete(null);
  }

  async function deleteChecklistItem(
    checklistItem: WorkflowStageChecklistDefinition,
  ) {
    if (!selectedStage) return;
    await checklistDeleteMutation.mutateAsync({
      stages: editor.graph.stages.map((stage) =>
        stage.stableKey === selectedStage.stableKey
          ? {
              ...stage,
              checklistItems: [...stage.checklistItems]
                .filter((item) => item.key !== checklistItem.key)
                .sort((left, right) => left.displayOrder - right.displayOrder)
                .map((item, index) => ({
                  ...item,
                  displayOrder: index + 1,
                })),
            }
          : stage,
      ),
      transitions: editor.graph.transitions,
    });
    setChecklistItemToDelete(null);
  }

  async function deleteDocumentRequirement(
    requirement: WorkflowStageDocumentRequirement,
  ) {
    if (!selectedStage) return;
    await documentRequirementDeleteMutation.mutateAsync({
      stages: editor.graph.stages.map((stage) =>
        stage.stableKey === selectedStage.stableKey
          ? {
              ...stage,
              documentRequirements: stage.documentRequirements.filter(
                (item) => item.name !== requirement.name,
              ),
            }
          : stage,
      ),
      transitions: editor.graph.transitions,
    });
    setDocumentRequirementToDelete(null);
  }

  return (
    <section className="rounded-[28px] border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-6">
      <WorkflowStagesHeader
        disabled={isEditingLocked}
        onAddStage={() => setStageDialog("create")}
      />
      <div className="mt-7 overflow-hidden rounded-2xl border border-brand-navy/15">
        <WorkflowFlowToolbar
          isExpanded={showVisualFlow}
          stageCount={stages.length}
          onToggle={() => setShowVisualFlow((value) => !value)}
        />
        {showVisualFlow ? (
          <WorkflowFlowPreview
            selectedCode={selectedStage?.stableKey}
            stages={stages}
            onSelect={setSelectedCode}
          />
        ) : null}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <WorkflowStageList
          selectedCode={selectedStage?.stableKey}
          stages={stages}
          onSelect={setSelectedCode}
        />
        <WorkflowStageDetails
          assignmentOptions={editor.assignmentOptions}
          canDelete={!isEditingLocked}
          canEdit={!isEditingLocked}
          editor={editor}
          isDeleting={deleteMutation.isPending}
          onAddAction={() => setActionDialog("create")}
          onAddChecklistItem={() => setChecklistDialog("create")}
          onAddDocumentRequirement={() =>
            setDocumentRequirementDialog("create")
          }
          onAddScoringCriterion={scoringOverlays.onAdd}
          onAddCommentField={commentFieldOverlays.onAdd}
          onAddTask={() => setTaskDialog("create")}
          onDelete={() => selectedStage && setStageToDelete(selectedStage)}
          onDeleteAction={setActionToDelete}
          onDeleteChecklistItem={setChecklistItemToDelete}
          onDeleteDocumentRequirement={setDocumentRequirementToDelete}
          onDeleteScoringCriterion={scoringOverlays.onDelete}
          onDeleteCommentField={commentFieldOverlays.onDelete}
          onDeleteTask={setTaskToDelete}
          onEdit={() => selectedStage && setStageDialog(selectedStage)}
          onEditAction={setActionDialog}
          onEditChecklistItem={setChecklistDialog}
          onEditDocumentRequirement={setDocumentRequirementDialog}
          onEditScoringCriterion={scoringOverlays.onEdit}
          onEditCommentField={commentFieldOverlays.onEdit}
          onEditTask={setTaskDialog}
          onPreviewTask={setTaskToPreview}
          stage={selectedStage}
          stageIndex={selectedIndex}
        />
      </div>
      {stageDialog ? (
        <WorkflowStageCreateDialog
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
          onClose={() => setTaskToPreview(null)}
          stage={selectedStage}
          task={taskToPreview}
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
      {commentFieldOverlays.overlays}
      <WorkflowActionOverlays
        actionDialog={actionDialog}
        actionToDelete={actionToDelete}
        editor={editor}
        onCloseDelete={() => setActionToDelete(null)}
        onCloseDialog={() => setActionDialog(null)}
        stage={selectedStage}
      />
      <ConfirmationDialog
        confirmText="Delete stage"
        errorMessage={deleteMutation.error?.message}
        isDangerous
        isLoading={deleteMutation.isPending}
        isOpen={stageToDelete !== null}
        message={
          <p>
            Delete <strong>{stageToDelete?.name}</strong>? Transitions through
            this stage will be reconnected where possible.
          </p>
        }
        onCancel={() => setStageToDelete(null)}
        onConfirm={() => stageToDelete && void deleteStage(stageToDelete)}
        title="Delete workflow stage"
      />
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
    </section>
  );
}
