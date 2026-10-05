"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowCoiService } from "../../ClientWorkflowCoiService";
import { invalidateApplicationViews } from "@/modules/applications/ui/invalidateApplicationViews";

const gateKey = (taskId: string) =>
  ["workflow", "task", taskId, "coi"] as const;

export function useWorkflowCoi(taskId: string, enabled = true) {
  return useQuery({
    enabled,
    queryKey: gateKey(taskId),
    queryFn: () => clientWorkflowCoiService.get(taskId),
  });
}

export function useDeclareWorkflowCoi(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      decision: "NO_CONFLICT" | "DISCLOSE";
      disclosureText?: string;
      expectedRowVersion: number;
    }) => clientWorkflowCoiService.declare(taskId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: gateKey(taskId) }),
        queryClient.invalidateQueries({
          queryKey: ["admin", "conflict-reviews"],
        }),
        invalidateApplicationViews(queryClient, true),
      ]),
  });
}
