"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  FundingCallCreateInput,
  FundingCallUpdateInput,
} from "./api/FundingCallSchemas";
import { clientFundingCallService } from "./ClientFundingCallService";

export const fundingCallQueryKeys = {
  all: ["admin", "funding-calls"] as const,
  bindableEligibilityRuleSetVersions: [
    "admin",
    "funding-calls",
    "eligibility-ruleset-versions",
  ] as const,
  bindableFormVersions: ["admin", "funding-calls", "form-versions"] as const,
  bindableWorkflowTemplateVersions: [
    "admin",
    "funding-calls",
    "workflow-template-versions",
  ] as const,
  detail: (id: string) => ["admin", "funding-calls", id] as const,
  list: (page: number, pageSize: number, fundingCallId?: string) => [
    "admin",
    "funding-calls",
    "list",
    page,
    pageSize,
    fundingCallId ?? "all",
  ] as const,
};

export function useBindableEligibilityRuleSetVersions() {
  return useQuery({
    queryFn: clientFundingCallService.listBindableEligibilityRuleSetVersions,
    queryKey: fundingCallQueryKeys.bindableEligibilityRuleSetVersions,
  });
}

export function useBindableApplicationFormVersions() {
  return useQuery({
    queryFn: clientFundingCallService.listBindableFormVersions,
    queryKey: fundingCallQueryKeys.bindableFormVersions,
  });
}

export function useBindableWorkflowTemplateVersions() {
  return useQuery({
    queryFn: clientFundingCallService.listBindableWorkflowTemplateVersions,
    queryKey: fundingCallQueryKeys.bindableWorkflowTemplateVersions,
  });
}

export function useFundingCalls(
  page: number,
  pageSize: number,
  fundingCallId?: string,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => clientFundingCallService.list({
      fundingCallId,
      page,
      pageSize,
    }),
    queryKey: fundingCallQueryKeys.list(page, pageSize, fundingCallId),
  });
}

export function useFundingCall(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => clientFundingCallService.get(id),
    queryKey: fundingCallQueryKeys.detail(id),
  });
}

export function useCreateFundingCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FundingCallCreateInput) =>
      clientFundingCallService.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: fundingCallQueryKeys.all,
    }),
  });
}

export function useUpdateFundingCall(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FundingCallUpdateInput) =>
      clientFundingCallService.update(id, input),
    onSuccess: (call) => {
      queryClient.setQueryData(fundingCallQueryKeys.detail(id), call);
      void queryClient.invalidateQueries({ queryKey: fundingCallQueryKeys.all });
    },
  });
}

export function usePublishFundingCall(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expectedRowVersion: number) =>
      clientFundingCallService.publish(id, expectedRowVersion),
    onSuccess: (call) => {
      queryClient.setQueryData(fundingCallQueryKeys.detail(id), call);
      void queryClient.invalidateQueries({ queryKey: fundingCallQueryKeys.all });
    },
  });
}

export function usePreviewFundingCallReadiness(id: string) {
  return useMutation({
    mutationFn: () => clientFundingCallService.previewReadiness(id),
  });
}
