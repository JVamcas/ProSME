"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BusinessProfileInput } from "./BusinessSchemas";
import { clientBusinessService } from "./ClientBusinessService";

export const businessQueryKeys = {
  all: ["portal", "businesses"] as const,
  detail: (id: string) => ["portal", "businesses", id] as const,
};

export function useBusinesses() {
  return useQuery({
    queryKey: businessQueryKeys.all,
    queryFn: clientBusinessService.listBusinesses,
  });
}

export function useBusiness(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: businessQueryKeys.detail(id ?? "new"),
    queryFn: () => clientBusinessService.getBusiness(id!),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientBusinessService.createBusiness,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.all }),
  });
}

export function useUpdateBusiness(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessProfileInput) =>
      clientBusinessService.updateBusiness(id, input),
    onSuccess: (business) => {
      queryClient.setQueryData(businessQueryKeys.detail(id), business);
      void queryClient.invalidateQueries({ queryKey: businessQueryKeys.all });
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientBusinessService.deleteBusiness,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueryKeys.all }),
  });
}
