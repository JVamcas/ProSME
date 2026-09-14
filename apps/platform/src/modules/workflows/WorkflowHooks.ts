"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowService } from "./ClientWorkflowService";
import type {
  CreateWorkflowInput,
  OpportunityAssignmentInput,
  UpdateWorkflowDraftInput,
  UpdateWorkflowDetailsInput,
} from "./WorkflowTransportTypes";
import type { WorkflowEditorView } from "./WorkflowTypes";

export const workflowQueryKeys = {
  all: ["admin", "workflows"] as const,
  assignments: ["admin", "workflows", "assignments"] as const,
  detail: (id: string) => ["admin", "workflows", id] as const,
  opportunities: ["admin", "workflows", "opportunities"] as const,
  published: ["admin", "workflows", "published"] as const,
};

export function useWorkflowDefinitions() {
  return useQuery({
    queryKey: workflowQueryKeys.all,
    queryFn: clientWorkflowService.listDefinitions,
  });
}

export function useWorkflowEditor(id: string, enabled = true) {
  return useQuery({
    queryKey: workflowQueryKeys.detail(id),
    queryFn: () => clientWorkflowService.getEditor(id),
    enabled: enabled && Boolean(id),
  });
}

function useRefreshWorkflow(id?: string) {
  const client = useQueryClient();
  return (editor?: WorkflowEditorView) => {
    if (id && editor) client.setQueryData(workflowQueryKeys.detail(id), editor);
    void client.invalidateQueries({ queryKey: workflowQueryKeys.all });
    void client.invalidateQueries({ queryKey: workflowQueryKeys.assignments });
    void client.invalidateQueries({ queryKey: workflowQueryKeys.published });
  };
}

export function useCreateWorkflow() {
  const refresh = useRefreshWorkflow();
  return useMutation({
    mutationFn: (input: CreateWorkflowInput) =>
      clientWorkflowService.createDefinition(input),
    onSuccess: refresh,
  });
}

export function useUpdateWorkflow(id: string) {
  const refresh = useRefreshWorkflow(id);
  return useMutation({
    mutationFn: (input: UpdateWorkflowDraftInput) =>
      clientWorkflowService.updateDraft(id, input),
    onSuccess: refresh,
  });
}

export function useUpdateWorkflowDetails(id: string) {
  const refresh = useRefreshWorkflow(id);
  return useMutation({
    mutationFn: (input: UpdateWorkflowDetailsInput) =>
      clientWorkflowService.updateDetails(id, input),
    onSuccess: refresh,
  });
}

export function useSaveWorkflowGraph(editor: WorkflowEditorView) {
  const refresh = useRefreshWorkflow(editor.definition.id);
  return useMutation({
    mutationFn: (graph: WorkflowEditorView["graph"]) =>
      clientWorkflowService.updateDraft(editor.definition.id, {
        expectedRowVersion: editor.version.rowVersion,
        graph,
      }),
    onSuccess: refresh,
  });
}

export function useValidateWorkflow(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => clientWorkflowService.validateDefinition(id),
    onSuccess: (validation) =>
      client.setQueryData<WorkflowEditorView>(
        workflowQueryKeys.detail(id),
        (current) => (current ? { ...current, validation } : current),
      ),
  });
}

export function useWorkflowLifecycle(id: string, action: "publish" | "retire") {
  const refresh = useRefreshWorkflow(id);
  return useMutation({
    mutationFn: (editor: WorkflowEditorView) =>
      clientWorkflowService.lifecycleCommand(id, action, editor),
    onSuccess: refresh,
  });
}

export function useWorkflowListLifecycle(action: "publish" | "retire") {
  const refresh = useRefreshWorkflow();
  return useMutation({
    mutationFn: async (definitionId: string) => {
      const editor = await clientWorkflowService.getEditor(definitionId);
      return clientWorkflowService.lifecycleCommand(
        definitionId,
        action,
        editor,
      );
    },
    onSuccess: refresh,
  });
}

export function useCloneWorkflow(id: string) {
  const refresh = useRefreshWorkflow(id);
  return useMutation({
    mutationFn: (sourceVersionId: string) =>
      clientWorkflowService.cloneDefinition(id, sourceVersionId),
    onSuccess: refresh,
  });
}

export function useWorkflowAssignments() {
  return useQuery({
    queryKey: workflowQueryKeys.assignments,
    queryFn: clientWorkflowService.listAssignments,
  });
}

export function useWorkflowOpportunities() {
  return useQuery({
    queryKey: workflowQueryKeys.opportunities,
    queryFn: clientWorkflowService.listOpportunities,
  });
}

export function usePublishedWorkflows() {
  return useQuery({
    queryKey: workflowQueryKeys.published,
    queryFn: clientWorkflowService.listPublished,
  });
}

export function useAssignWorkflow() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OpportunityAssignmentInput) =>
      clientWorkflowService.assignOpportunity(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: workflowQueryKeys.assignments }),
  });
}
