"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientWorkQueueService } from "./ClientWorkQueueService";
import type { WorkflowActionExecutionRequest } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import type { WorkQueueListInput } from "./WorkQueueTypes";

export const workQueueQueryKeys = {
  all: ["admin", "work-queue"] as const,
  list: (input: WorkQueueListInput) =>
    ["admin", "work-queue", input] as const,
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
    mutationFn: (input: Parameters<typeof clientWorkQueueService.completeTask>[1]) =>
      clientWorkQueueService.completeTask(taskId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all });
    },
  });
}

export function useEvaluateAuthoritativeEligibility(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expectedRowVersion: number) =>
      clientWorkQueueService.evaluateEligibility(taskId, expectedRowVersion),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: workQueueQueryKeys.task(taskId),
      }),
    ]),
  });
}

export function useExecuteWorkflowTaskAction(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: {
      actionKey: string;
      input: WorkflowActionExecutionRequest;
      workflowInstanceId: string;
    }) => clientWorkQueueService.executeAction(
      command.workflowInstanceId,
      command.actionKey,
      command.input,
    ),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all }),
      queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.task(taskId) }),
    ]),
  });
}
