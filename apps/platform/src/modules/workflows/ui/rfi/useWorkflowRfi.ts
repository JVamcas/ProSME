"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateApplicationViews } from "@/modules/applications/ui/invalidateApplicationViews";
import { clientWorkflowRfiService } from "../../ClientWorkflowRfiService";

export const workflowRfiQueryKeys = {
  contextual: (applicationId: string) =>
    ["admin", "applications", "detail", applicationId, "requests"] as const,
  application: (applicationId: string) =>
    ["portal", "applications", applicationId, "requests"] as const,
  ownedDetail: (applicationId: string, requestId: string) =>
    ["portal", "applications", applicationId, "requests", requestId] as const,
  task: (taskId: string) => ["admin", "tasks", taskId, "requests"] as const,
  taskDetail: (taskId: string, requestId: string) =>
    ["admin", "tasks", taskId, "requests", requestId] as const,
};

export function useOwnedWorkflowRfis(applicationId: string, enabled = true) {
  return useQuery({
    enabled,
    queryFn: ({ signal }) =>
      clientWorkflowRfiService.listOwned(applicationId, signal),
    queryKey: workflowRfiQueryKeys.application(applicationId),
  });
}

export function useContextualWorkflowRfis(applicationId: string) {
  return useQuery({
    queryKey: workflowRfiQueryKeys.contextual(applicationId),
    queryFn: ({ signal }) =>
      clientWorkflowRfiService.listContextual(applicationId, signal),
  });
}

export function useOwnedWorkflowRfi(
  applicationId: string,
  requestId: string,
  initialData?: Awaited<ReturnType<typeof clientWorkflowRfiService.getOwned>>,
) {
  return useQuery({
    initialData,
    queryFn: () => clientWorkflowRfiService.getOwned(applicationId, requestId),
    queryKey: workflowRfiQueryKeys.ownedDetail(applicationId, requestId),
  });
}

export function useSaveWorkflowRfiDraft(
  applicationId: string,
  requestId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkflowRfiService.saveDraft>[2],
    ) => clientWorkflowRfiService.saveDraft(applicationId, requestId, input),
    onSuccess: (draft, input) => {
      client.setQueryData(
        workflowRfiQueryKeys.ownedDetail(applicationId, requestId),
        (
          detail:
            | Awaited<ReturnType<typeof clientWorkflowRfiService.getOwned>>
            | undefined,
        ) =>
          detail
            ? {
                ...detail,
                draft: {
                  fieldValues: input.fieldValues,
                  rowVersion: draft.rowVersion,
                  updatedAt: draft.updatedAt,
                },
              }
            : detail,
      );
    },
  });
}

export function useUploadWorkflowRfiDocument(
  applicationId: string,
  requestId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; requirementId: string }) =>
      clientWorkflowRfiService.uploadDocument(
        applicationId,
        requestId,
        input.requirementId,
        input.file,
      ),
    onSuccess: (detail) =>
      client.setQueryData(
        workflowRfiQueryKeys.ownedDetail(applicationId, requestId),
        detail,
      ),
  });
}

export function useRespondToWorkflowRfi(
  applicationId: string,
  requestId: string,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkflowRfiService.respond>[2],
    ) => clientWorkflowRfiService.respond(applicationId, requestId, input),
    onSuccess: () => invalidateApplicationViews(client, true),
  });
}

export function useTaskWorkflowRfis(taskId: string) {
  return useQuery({
    queryFn: () => clientWorkflowRfiService.listTask(taskId),
    queryKey: workflowRfiQueryKeys.task(taskId),
  });
}

export function useTaskWorkflowRfi(taskId: string, requestId: string | null) {
  return useQuery({
    enabled: Boolean(requestId),
    queryFn: () => clientWorkflowRfiService.getTask(taskId, requestId!),
    queryKey: workflowRfiQueryKeys.taskDetail(taskId, requestId ?? ""),
  });
}

export function useFollowUpWorkflowRfi(taskId: string, requestId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      clientWorkflowRfiService.followUp(taskId, requestId, message),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: workflowRfiQueryKeys.task(taskId),
        }),
        invalidateApplicationViews(client, true),
      ]),
  });
}

export function useCloseWorkflowRfi(taskId: string, requestId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (expectedRowVersion: number) =>
      clientWorkflowRfiService.close(taskId, requestId, expectedRowVersion),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({
          queryKey: workflowRfiQueryKeys.task(taskId),
        }),
        invalidateApplicationViews(client, true),
      ]),
  });
}
