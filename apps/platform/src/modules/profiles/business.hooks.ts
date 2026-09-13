"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BusinessProfileInput } from "./profile.schemas";
import { businessClientService } from "./business-client.service";

export const businessQueryKeys = {
  all: ["portal", "businesses"] as const,
  detail: (id: string) => ["portal", "businesses", id] as const,
};

export function useBusinesses() {
  return useQuery({
    queryKey: businessQueryKeys.all,
    queryFn: businessClientService.listBusinesses,
  });
}

export function useBusiness(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: businessQueryKeys.detail(id ?? "new"),
    queryFn: () => businessClientService.getBusiness(id!),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: businessClientService.createBusiness,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.all }),
  });
}

export function useUpdateBusiness(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessProfileInput) =>
      businessClientService.updateBusiness(id, input),
    onSuccess: (business) => {
      queryClient.setQueryData(businessQueryKeys.detail(id), business);
      void queryClient.invalidateQueries({ queryKey: businessQueryKeys.all });
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: businessClientService.deleteBusiness,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueryKeys.all }),
  });
}
