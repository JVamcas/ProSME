"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import { WorkflowTransitionDialog } from "./WorkflowTransitionDialog";

type Props = {
  canEdit: boolean;
  editor: WorkflowEditorView;
  stage: WorkflowStageInput;
};

function transitionColumns(
  canEdit: boolean,
  editor: WorkflowEditorView,
  stage: WorkflowStageInput,
  onDelete: (transition: WorkflowTransitionDefinition) => void,
  onEdit: (transition: WorkflowTransitionDefinition) => void,
): DataTableColumn<WorkflowTransitionDefinition>[] {
  return [
    {
      accessorKey: "actionKey",
      header: "Action",
      cell: ({ row }) =>
        stage.actions.find(
          (action) => action.stableKey === row.original.actionKey,
        )?.label ?? row.original.actionKey,
    },
    {
      id: "destination",
      header: "Destination",
      cell: ({ row }) => {
        if (row.original.terminalOutcome) {
          return `Outcome: ${row.original.terminalOutcome}`;
        }
        return (
          editor.graph.stages.find(
            (item) => item.stableKey === row.original.targetStageKey,
          )?.name ?? row.original.targetStageKey
        );
      },
    },
    { accessorKey: "priority", header: "Priority" },
    {
      id: "controls",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-start gap-1">
          <EditButton
            disabled={!canEdit}
            onClick={() => onEdit(row.original)}
            title="Edit transition"
          />
          <DeleteButton
            disabled={!canEdit}
            onClick={() => onDelete(row.original)}
            title="Delete transition"
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageTransitionTable({
  canEdit,
  editor,
  stage,
}: Props) {
  const [dialog, setDialog] = useState<
    "create" | WorkflowTransitionDefinition | null
  >(null);
  const [toDelete, setToDelete] = useState<WorkflowTransitionDefinition | null>(
    null,
  );
  const mutation = useSaveWorkflowGraph(editor);
  const transitions = editor.graph.transitions
    .filter((item) => item.sourceStageKey === stage.stableKey)
    .sort((left, right) => left.priority - right.priority);

  async function deleteTransition() {
    if (!toDelete) return;
    await mutation.mutateAsync({
      stages: editor.graph.stages,
      transitions: editor.graph.transitions.filter(
        (item) => item.id !== toDelete.id,
      ),
    });
    setToDelete(null);
  }

  return (
    <section className="mt-5">
      <WorkflowStageTabHeader
        action={
          canEdit && stage.actions.length !== 0 ? (
            <GeneralButton
              onClick={() => setDialog("create")}
              size="compact"
              type="button"
              variant="primary"
            >
              <Plus className="size-4" /> Add transition
            </GeneralButton>
          ) : undefined
        }
        count={transitions.length}
        description="Define how this stage routes to another stage or a terminal outcome."
        title="Transitions"
      />
      <DataTable
        columns={transitionColumns(
          canEdit,
          editor,
          stage,
          setToDelete,
          setDialog,
        )}
        data={transitions}
        emptyMessage={
          stage.actions.length
            ? "No transitions have been added to this stage."
            : "Add an action before configuring transitions."
        }
        minWidth={640}
      />
      {dialog ? (
        <WorkflowTransitionDialog
          editor={editor}
          onClose={() => setDialog(null)}
          stage={stage}
          transition={dialog === "create" ? undefined : dialog}
        />
      ) : null}
      <ConfirmationDialog
        confirmText="Delete transition"
        errorMessage={mutation.error?.message}
        isDangerous
        isLoading={mutation.isPending}
        isOpen={toDelete !== null}
        message="Delete this transition?"
        onCancel={() => setToDelete(null)}
        onConfirm={() => void deleteTransition()}
        title="Delete transition"
      />
    </section>
  );
}
