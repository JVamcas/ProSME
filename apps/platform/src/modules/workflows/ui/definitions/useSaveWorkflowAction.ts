"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientWorkflowService } from "../../ClientWorkflowService";
import type { WorkflowActionSaveInput } from "../../api/WorkflowActionSaveSchema";
import type { WorkflowEditorView } from "../../domain/definitions/WorkflowTypes";
import { cacheWorkflowActionEditor } from "./WorkflowEditorCache";

export function useSaveWorkflowAction(editor: WorkflowEditorView) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Omit<WorkflowActionSaveInput, "versionId" | "expectedRowVersion">,
    ) =>
      clientWorkflowService.saveAction(editor.definition.id, {
        ...input,
        versionId: editor.version.id,
        expectedRowVersion: editor.version.rowVersion,
      }),
    onSuccess: (updated) => cacheWorkflowActionEditor(client, updated, editor),
  });
}
