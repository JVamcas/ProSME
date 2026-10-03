"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { applicationQueryKeys } from "@/modules/applications/ApplicationHooks";
import { clientWorkQueueService } from "./ClientWorkQueueService";
import type { WorkflowActionExecutionRequest } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import type { WorkQueueListInput } from "./WorkQueueTypes";

export const workQueueQueryKeys = {
  all: ["admin", "work-queue"] as const,
  list: (input: WorkQueueListInput) => ["admin", "work-queue", input] as const,
  task: (taskId: string) => ["admin", "work-queue", "task", taskId] as const,
};

export function useWorkQueue(input: WorkQueueListInput) {
  return useQuery({
    queryFn: () => clientWorkQueueService.list(input),
    queryKey: workQueueQueryKeys.list(input),
  });
}

export function useWorkflowTask(taskId: string, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => clientWorkQueueService.getTask(taskId),
    queryKey: workQueueQueryKeys.task(taskId),
  });
}

export function useCompleteWorkflowTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkQueueService.completeTask>[1],
    ) => clientWorkQueueService.completeTask(taskId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all });
    },
  });
}

export function useSaveTaskReviewDraft(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkQueueService.saveReviewDraft>[1],
    ) => clientWorkQueueService.saveReviewDraft(taskId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: workQueueQueryKeys.task(taskId),
      }),
  });
}

export function useUploadWorkflowTaskDocument(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { file: File; requirementId: string }) =>
      clientWorkQueueService.uploadTaskDocument(
        taskId,
        input.requirementId,
        input.file,
      ),
    onSuccess: (task) => {
      queryClient.setQueryData(workQueueQueryKeys.task(taskId), task);
      void queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all });
    },
  });
}

export function useEvaluateAuthoritativeEligibility(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkQueueService.evaluateEligibility>[1],
    ) => clientWorkQueueService.evaluateEligibility(taskId, input),
    onSuccess: (result) => {
      if ("confirmationRequired" in result) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.admin }),
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.own }),
        queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: workQueueQueryKeys.task(taskId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "tasks", taskId, "form"],
        }),
      ]);
    },
  });
}

export function useExecuteWorkflowTaskAction(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: {
      actionKey: string;
      input: WorkflowActionExecutionRequest;
      workflowInstanceId: string;
    }) =>
      clientWorkQueueService.executeAction(
        command.workflowInstanceId,
        command.actionKey,
        command.input,
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "tasks", taskId, "requests"],
        }),
        queryClient.invalidateQueries({
          queryKey: workQueueQueryKeys.task(taskId),
        }),
      ]),
  });
}

export function useCancelWorkflowEscalation(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: Parameters<typeof clientWorkQueueService.cancelEscalation>[1],
    ) => clientWorkQueueService.cancelEscalation(taskId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "workflow-progress"],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "tasks", taskId] }),
      ]),
    onError: () =>
      queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
  });
}

export function useWorkflowEscalationTracking(taskId: string) {
  return useQuery({
    queryKey: [...workQueueQueryKeys.task(taskId), "escalation"],
    queryFn: () => clientWorkQueueService.getEscalationTracking(taskId),
  });
}
