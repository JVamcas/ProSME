"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowCoiReviewService } from "../../ClientWorkflowCoiReviewService";
import { invalidateApplicationViews } from "@/modules/applications/ui/invalidateApplicationViews";
import type {
  WorkflowCoiReviewDecision,
  WorkflowCoiReviewListInput,
} from "../../api/WorkflowCoiReviewTypes";

export const workflowCoiReviewKeys = {
  all: ["admin", "conflict-reviews"] as const,
  detail: (taskId: string) => ["admin", "conflict-reviews", taskId] as const,
  list: (input: WorkflowCoiReviewListInput) =>
    ["admin", "conflict-reviews", "list", input] as const,
};

export function useWorkflowCoiReviews(input: WorkflowCoiReviewListInput) {
  return useQuery({
    queryFn: () => clientWorkflowCoiReviewService.list(input),
    queryKey: workflowCoiReviewKeys.list(input),
  });
}

export function useWorkflowCoiReview(taskId: string | null) {
  return useQuery({
    enabled: Boolean(taskId),
    queryFn: () => clientWorkflowCoiReviewService.get(taskId!),
    queryKey: workflowCoiReviewKeys.detail(taskId ?? "closed"),
  });
}

export function useDecideWorkflowCoiReview(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkflowCoiReviewDecision) =>
      clientWorkflowCoiReviewService.decide(taskId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: workflowCoiReviewKeys.all }),
        queryClient.invalidateQueries({
          queryKey: ["workflow", "task", taskId, "coi"],
        }),
        invalidateApplicationViews(queryClient, true),
      ]),
  });
}
