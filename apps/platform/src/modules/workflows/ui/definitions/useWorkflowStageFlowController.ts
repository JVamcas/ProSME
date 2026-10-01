"use client";

import { useMemo, useState } from "react";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
  WorkflowValidation,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import { useWorkflowStageCommentFieldOverlays } from "@/modules/workflows/ui/definitions/useWorkflowStageCommentFieldOverlays";
import { useWorkflowStageScoringOverlays } from "@/modules/workflows/ui/definitions/useWorkflowStageScoringOverlays";
import { inspectWorkflowStageDeletion } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import { workflowStageDeletionRoles } from "@/modules/workflows/ui/definitions/WorkflowStageDeletionColors";

export type WorkflowStageFlowProps = {
  canEdit: boolean;
  editor: WorkflowEditorView;
};

export function useWorkflowStageFlowController({
  canEdit,
  editor,
}: WorkflowStageFlowProps) {
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
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [stageDialog, setStageDialog] = useState<
    "create" | WorkflowStageInput | null
  >(null);
  const [stageToDelete, setStageToDelete] = useState<WorkflowStageInput | null>(
    null,
  );
  const [deletionValidation, setDeletionValidation] =
    useState<WorkflowValidation | null>(null);
  const deletionRoles = useMemo(
    () => stageToDelete
      ? workflowStageDeletionRoles(
          inspectWorkflowStageDeletion(editor.graph, stageToDelete.stableKey),
        )
      : undefined,
    [editor.graph, stageToDelete],
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
  const commentOverlays = useWorkflowStageCommentFieldOverlays(
    editor,
    selectedStage,
  );
  const scoringOverlays = useWorkflowStageScoringOverlays(
    editor,
    selectedStage,
  );

  return {
    stages,
    selectedCode,
    setSelectedCode,
    showVisualFlow,
    setShowVisualFlow,
    layoutRevision,
    setLayoutRevision,
    stageDialog,
    setStageDialog,
    stageToDelete,
    setStageToDelete,
    deletionValidation,
    setDeletionValidation,
    deletionRoles,
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
    isEditingLocked,
    selectedStage,
    selectedIndex,
    commentOverlays,
    scoringOverlays,
    editor,
  };
}
