import { useState } from "react";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";
import { workflowRouteDestination } from "./WorkflowActionEditorRoutes";
import { WorkflowActionRouteEditor } from "./WorkflowActionRouteEditor";

export function useWorkflowPathOverlays(
  editor: WorkflowEditorView,
  canEdit: boolean,
) {
  const [selection, setSelection] = useState<{
    index: number;
    mode: "edit" | "delete";
  } | null>(null);
  const mutation = useSaveWorkflowGraph(editor);
  const route = selection ? editor.graph.transitions[selection.index] : undefined;
  const stage = editor.graph.stages.find(
    (item) => item.stableKey === route?.sourceStageKey,
  );
  const action = stage?.actions.find((item) => item.stableKey === route?.actionKey);
  const otherRoutes = editor.graph.transitions.filter(
    (item, index) => index !== selection?.index
      && item.sourceStageKey === route?.sourceStageKey
      && item.actionKey === route?.actionKey,
  );
  let targetTypeConstraint: "TERMINAL" | "STAGE" | undefined;
  if (action?.actionType === "REJECT" && otherRoutes.length) {
    targetTypeConstraint = otherRoutes[0].terminalOutcome ? "TERMINAL" : "STAGE";
  }

  function open(transition: WorkflowTransitionInput, mode: "edit" | "delete") {
    if (!canEdit || mutation.isPending) return;
    const index = editor.graph.transitions.findIndex(
      (item) => item === transition || Boolean(item.id && item.id === transition.id),
    );
    if (index < 0) return;
    mutation.reset();
    setSelection({ index, mode });
  }

  function close() {
    if (!mutation.isPending) setSelection(null);
  }

  async function save(nextRoute?: WorkflowTransitionInput) {
    if (!canEdit || mutation.isPending || !selection || !route) return;
    const transitions = nextRoute
      ? editor.graph.transitions.map((item, index) =>
          index === selection.index ? nextRoute : item,
        )
      : editor.graph.transitions.filter((_, index) => index !== selection.index);
    try {
      await mutation.mutateAsync({ stages: editor.graph.stages, transitions });
      setSelection(null);
    } catch {
      // Keep the dialog open; the mutation error is displayed below.
    }
  }

  return {
    onEdit: (transition: WorkflowTransitionInput) => open(transition, "edit"),
    onDelete: (transition: WorkflowTransitionInput) => open(transition, "delete"),
    isPending: mutation.isPending,
    overlays: (
      <>
        {selection?.mode === "edit" && route && stage ? (
          <DraggableDialog isOpen onClose={close} size="2xl" title="Edit workflow path">
            <p className="mb-4 text-sm text-brand-navy/70">
              {stage.name}: {action?.label ?? route.actionKey}
            </p>
            <fieldset disabled={!canEdit || mutation.isPending}>
              <WorkflowActionRouteEditor
                actionKey={route.actionKey}
                editor={editor}
                onCancel={close}
                onSave={(nextRoute) => void save(nextRoute)}
                priority={route.priority}
                priorityInUse={(priority) =>
                  otherRoutes.some((item) => item.priority === priority)
                }
                route={route}
                stage={stage}
                targetTypeConstraint={targetTypeConstraint}
              />
            </fieldset>
            {mutation.error ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {mutation.error.message}
              </p>
            ) : null}
          </DraggableDialog>
        ) : null}
        <ConfirmationDialog
          confirmText="Delete path"
          errorMessage={mutation.error?.message}
          isDangerous
          isLoading={mutation.isPending}
          isOpen={selection?.mode === "delete" && Boolean(route)}
          message={route ? (
            <p>
              Delete the <strong>{action?.label ?? route.actionKey}</strong> path
              from <strong>{stage?.name ?? route.sourceStageKey}</strong> to{" "}
              <strong>{workflowRouteDestination(route, editor.graph)}</strong>?
            </p>
          ) : null}
          onCancel={close}
          onConfirm={() => void save()}
          title="Delete workflow path"
        />
      </>
    ),
  };
}
