"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowEditorView } from "../../domain/definitions/WorkflowTypes";
import type { WorkflowActionDeletionInput } from "../../api/WorkflowActionDeletionSchema";

export function useDeleteWorkflowAction(editor: WorkflowEditorView) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      target: Pick<WorkflowActionDeletionInput, "actionKey" | "stageKey">,
    ) =>
      clientWorkflowService.deleteAction(editor.definition.id, {
        ...target,
        versionId: editor.version.id,
        expectedRowVersion: editor.version.rowVersion,
      }),
    onSuccess: (updated) => {
      client.setQueryData(
        workflowQueryKeys.detail(editor.definition.id),
        updated,
      );
      client.setQueryData(
        workflowQueryKeys.detail(editor.definition.id, editor.version.id),
        updated,
      );
      void client.invalidateQueries({ queryKey: workflowQueryKeys.all });
      void client.invalidateQueries({ queryKey: workflowQueryKeys.templates });
    },
  });
}
