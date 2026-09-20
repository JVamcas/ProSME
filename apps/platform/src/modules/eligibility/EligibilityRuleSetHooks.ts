"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateEligibilityRuleSetInput,
  UpdateEligibilityRuleSetBuilderInput,
} from "./api/EligibilityRuleSetTransport";
import type { EligibilityTestInput } from "./api/EligibilityTestSchemas";
import { clientEligibilityRuleSetService } from "./ClientEligibilityRuleSetService";

export const eligibilityRuleSetQueryKeys = {
  all: ["admin", "eligibility-rulesets"] as const,
  detail: (id: string) => ["admin", "eligibility-rulesets", id] as const,
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

export function useEligibilityRuleSetBuilder(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => clientEligibilityRuleSetService.get(id),
    queryKey: eligibilityRuleSetQueryKeys.detail(id),
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

export function useUpdateEligibilityRuleSet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEligibilityRuleSetBuilderInput) =>
      clientEligibilityRuleSetService.update(id, input),
    onSuccess: (view) => {
      queryClient.setQueryData(eligibilityRuleSetQueryKeys.detail(id), view);
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
