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
  bindableFormVersions: ["admin", "funding-calls", "form-versions"] as const,
  detail: (id: string) => ["admin", "funding-calls", id] as const,
  list: (page: number, pageSize: number) => [
    "admin",
    "funding-calls",
    "list",
    page,
    pageSize,
  ] as const,
};

export function useBindableApplicationFormVersions() {
  return useQuery({
    queryFn: clientFundingCallService.listBindableFormVersions,
    queryKey: fundingCallQueryKeys.bindableFormVersions,
  });
}

export function useFundingCalls(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => clientFundingCallService.list({ page, pageSize }),
    queryKey: fundingCallQueryKeys.list(page, pageSize),
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
