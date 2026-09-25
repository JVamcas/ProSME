"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientWorkflowCoiService } from "../../ClientWorkflowCoiService";

const gateKey = (taskId: string) => ["workflow", "task", taskId, "coi"] as const;

export function useWorkflowCoi(taskId: string) {
  return useQuery({
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gateKey(taskId) }),
  });
}

