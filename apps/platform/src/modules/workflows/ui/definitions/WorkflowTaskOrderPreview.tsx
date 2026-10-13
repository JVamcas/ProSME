"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSaveWorkflowGraph } from "../../WorkflowHooks";
import type { WorkflowEditorView } from "../../domain/definitions/WorkflowTypes";
import type { WorkflowTaskSectionId } from "../../domain/definitions/WorkflowTaskSectionOrder";
import { WorkflowTaskPreviewDialog } from "./WorkflowTaskPreviewDialog";

export function WorkflowTaskOrderPreview({
  canEdit,
  editor,
  onClose,
  stageKey,
  taskKey,
}: {
  canEdit: boolean;
  editor: WorkflowEditorView;
  onClose: () => void;
  stageKey: string;
  taskKey: string;
}) {
  const [savedEditor, setSavedEditor] = useState<WorkflowEditorView | null>(null);
  const currentEditor =
    savedEditor && savedEditor.version.rowVersion > editor.version.rowVersion
      ? savedEditor
      : editor;
  const mutation = useSaveWorkflowGraph(currentEditor);
  const saving = useRef(false);
  const stage = currentEditor.graph.stages.find(
    (item) => item.stableKey === stageKey,
  );
  const task = stage?.tasks.find((item) => item.stableKey === taskKey);
  const editable = canEdit && currentEditor.version.status === "DRAFT";

  async function saveOrder(order: {
    sectionOrder?: WorkflowTaskSectionId[];
    formSectionOrder?: string[];
  }) {
    if (!editable || saving.current) return;
    saving.current = true;
    try {
      const updated = await mutation.mutateAsync({
        ...currentEditor.graph,
        stages: currentEditor.graph.stages.map((item) => {
          if (item.stableKey !== stageKey) return item;
          return {
            ...item,
            tasks: item.tasks.map((task) => {
              if (task.stableKey !== taskKey) return task;
              const config =
                task.config && typeof task.config === "object"
                  ? task.config as Record<string, unknown>
                  : {};
              return { ...task, config: { ...config, ...order } };
            }),
          };
        }),
      });
      setSavedEditor(updated);
      toast.success("Task step order saved.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save task step order.",
      );
    } finally {
      saving.current = false;
    }
  }

  if (!stage || !task) return null;
  return (
    <WorkflowTaskPreviewDialog
      definitionId={editor.definition.id}
      onClose={mutation.isPending ? () => undefined : onClose}
      onSectionOrderChange={
        editable ? (ids) => void saveOrder({ sectionOrder: ids }) : undefined
      }
      onFormSectionOrderChange={
        editable ? (ids) => void saveOrder({ formSectionOrder: ids }) : undefined
      }
      orderingPending={mutation.isPending}
      stage={stage}
      task={task}
      versionId={editor.version.id}
    />
  );
}
