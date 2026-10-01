"use client";

import type {
  WorkflowGraphInput,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import type { WorkflowStageDocumentRequirement } from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import {
  useWorkflowStageFlowController,
  type WorkflowStageFlowProps,
} from "./useWorkflowStageFlowController";
import { WorkflowStageFlowView } from "./WorkflowStageFlowView";
import { WorkflowStageFlowDialogs } from "./WorkflowStageFlowDialogs";

export function WorkflowStageFlow(props: WorkflowStageFlowProps) {
  const controller = useWorkflowStageFlowController(props);
  const {
    stages,
    setSelectedCode,
    setStageToDelete,
    setDeletionValidation,
    setTaskToDelete,
    setChecklistItemToDelete,
    setDocumentRequirementToDelete,
    deleteMutation,
    taskDeleteMutation,
    checklistDeleteMutation,
    documentRequirementDeleteMutation,
    selectedStage,
    selectedIndex,
    editor,
  } = controller;

  function openStageDelete(stage: WorkflowStageInput) {
    deleteMutation.reset();
    setStageToDelete(stage);
  }

  async function deleteStage(graph: WorkflowGraphInput) {
    if (stages.length <= 1) return;
    const updatedEditor = await deleteMutation.mutateAsync(graph);
    setSelectedCode(
      graph.stages[Math.min(selectedIndex, graph.stages.length - 1)].stableKey,
    );
    setDeletionValidation(updatedEditor.validation);
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

  const view = {
    ...controller,
    openStageDelete,
    deleteStage,
    deleteTask,
    deleteChecklistItem,
    deleteDocumentRequirement,
  };
  return (
    <WorkflowStageFlowView view={view}>
      <WorkflowStageFlowDialogs view={view} />
    </WorkflowStageFlowView>
  );
}

export type WorkflowStageFlowViewModel =
  ReturnType<typeof useWorkflowStageFlowController> & {
    openStageDelete: (stage: WorkflowStageInput) => void;
    deleteStage: (graph: WorkflowGraphInput) => Promise<void>;
    deleteTask: (task: WorkflowTaskInput) => Promise<void>;
    deleteChecklistItem: (item: WorkflowStageChecklistDefinition) => Promise<void>;
    deleteDocumentRequirement: (requirement: WorkflowStageDocumentRequirement) => Promise<void>;
  };
