"use client";

import { useMemo, useState } from "react";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageCreateDialog } from "./WorkflowStageCreateDialog";
import { WorkflowStageDetails } from "./WorkflowStageDetails";
import { WorkflowTaskDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskDialog";
import {
  WorkflowFlowPreview,
  WorkflowFlowToolbar,
  WorkflowStageList,
  WorkflowStagesHeader,
} from "./WorkflowStageFlowParts";

export function WorkflowStageFlow({
  canEdit,
  editor,
}: {
  canEdit: boolean;
  editor: WorkflowEditorView;
}) {
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
  const [taskDialog, setTaskDialog] = useState<
    "create" | WorkflowTaskInput | null
  >(null);
  const [taskToDelete, setTaskToDelete] = useState<WorkflowTaskInput | null>(
    null,
  );
  const deleteMutation = useSaveWorkflowGraph(editor);
  const taskDeleteMutation = useSaveWorkflowGraph(editor);
  const isEditingLocked = !canEdit;

  const selectedStage =
    stages.find((stage) => stage.stableKey === selectedCode) ?? stages[0];
  const selectedIndex = selectedStage
    ? stages.findIndex((stage) => stage.stableKey === selectedStage.stableKey)
    : -1;

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
          (transition) => transition.fromStageCode !== stage.stableKey,
        )
        .flatMap((transition) =>
          transition.toStageCode !== stage.stableKey
            ? [transition]
            : successor
              ? [{ ...transition, toStageCode: successor }]
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
      transitions: editor.graph.transitions.map((transition) => ({
        ...transition,
        condition:
          transition.condition?.type === "TASK_RESULT_EQUALS" &&
          transition.fromStageCode === selectedStage.stableKey &&
          transition.condition.taskCode === task.stableKey
            ? null
            : transition.condition,
      })),
    });
    setTaskToDelete(null);
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
          canDelete={!isEditingLocked && stages.length > 1}
          canEdit={!isEditingLocked}
          isDeleting={deleteMutation.isPending}
          onAddTask={() => setTaskDialog("create")}
          onDelete={() => selectedStage && setStageToDelete(selectedStage)}
          onDeleteTask={setTaskToDelete}
          onEdit={() => selectedStage && setStageDialog(selectedStage)}
          onEditTask={setTaskDialog}
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
