"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  EligibilityQuestionInput,
  EligibilityQuestionUpdateInput,
} from "./api/EligibilityQuestionSchemas";
import { clientEligibilityQuestionService } from "./ClientEligibilityQuestionService";

export const eligibilityQuestionQueryKeys = {
  all: ["admin", "eligibility-questions"] as const,
  list: (page: number, pageSize: number) => [
    "admin",
    "eligibility-questions",
    "list",
    page,
    pageSize,
  ] as const,
};

export function useEligibilityQuestions(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => clientEligibilityQuestionService.list({ page, pageSize }),
    queryKey: eligibilityQuestionQueryKeys.list(page, pageSize),
  });
}

export function useCreateEligibilityQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EligibilityQuestionInput) =>
      clientEligibilityQuestionService.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: eligibilityQuestionQueryKeys.all,
    }),
  });
}

export function useUpdateEligibilityQuestion(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EligibilityQuestionUpdateInput) => {
      if (!id) throw new Error("Select an eligibility question to edit.");
      return clientEligibilityQuestionService.update(id, input);
    },
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: eligibilityQuestionQueryKeys.all,
    }),
  });
}
