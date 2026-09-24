"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateEligibilityRuleSetInput,
  UpdateEligibilityRuleSetBuilderInput,
  UpdateEligibilityRuleSetDefinitionInput,
} from "./api/EligibilityRuleSetTransport";
import type { EligibilityTestInput } from "./api/EligibilityTestSchemas";
import { clientEligibilityRuleSetService } from "./ClientEligibilityRuleSetService";

export const eligibilityRuleSetQueryKeys = {
  all: ["admin", "eligibility-rulesets"] as const,
  detail: (id: string, versionId?: string) => [
    "admin",
    "eligibility-rulesets",
    id,
    versionId ?? "preferred",
  ] as const,
  list: (page: number, pageSize: number) => [
    "admin",
    "eligibility-rulesets",
    "list",
    page,
    pageSize,
  ] as const,
};

export function useEligibilityRuleSets(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => clientEligibilityRuleSetService.list({ page, pageSize }),
    queryKey: eligibilityRuleSetQueryKeys.list(page, pageSize),
  });
}

export function useEligibilityRuleSetBuilder(id: string, versionId?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => clientEligibilityRuleSetService.get(id, versionId),
    queryKey: eligibilityRuleSetQueryKeys.detail(id, versionId),
  });
}

export function useCreateEligibilityRuleSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEligibilityRuleSetInput) =>
      clientEligibilityRuleSetService.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: eligibilityRuleSetQueryKeys.all,
    }),
  });
}

export function useUpdateEligibilityRuleSetDefinition(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEligibilityRuleSetDefinitionInput) => {
      if (!id) throw new Error("Select an eligibility ruleset to edit.");
      return clientEligibilityRuleSetService.updateDefinition(id, input);
    },
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: eligibilityRuleSetQueryKeys.all,
    }),
  });
}

export function useUpdateEligibilityRuleSet(id: string, versionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEligibilityRuleSetBuilderInput) =>
      clientEligibilityRuleSetService.update(id, input, versionId),
    onSuccess: (view) => {
      queryClient.setQueryData(
        eligibilityRuleSetQueryKeys.detail(id, versionId),
        view,
      );
      void queryClient.invalidateQueries({
        queryKey: eligibilityRuleSetQueryKeys.all,
      });
    },
  });
}

export function useEligibilityRuleSetLifecycle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientEligibilityRuleSetService.lifecycle.bind(null, id),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: eligibilityRuleSetQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: eligibilityRuleSetQueryKeys.detail(id),
      }),
    ]),
  });
}

export function useEligibilityRuleSetTest(id: string) {
  return useMutation({
    mutationFn: (input: EligibilityTestInput) =>
      clientEligibilityRuleSetService.test(id, input),
  });
}
