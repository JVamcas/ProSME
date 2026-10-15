"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import { cacheWorkflowActionEditor } from "./WorkflowEditorCache";
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
    onSuccess: (updated) => cacheWorkflowActionEditor(client, updated, editor),
  });
}
