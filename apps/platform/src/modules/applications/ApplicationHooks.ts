"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApplicationUpdateInput } from "./ApplicationSchemas";
import type { ApplicationListInput } from "./ApplicationTypes";
import { clientApplicationService } from "./ClientApplicationService";

export const applicationQueryKeys = {
  all: ["applications"] as const,
  own: ["portal", "applications"] as const,
  list: (input: ApplicationListInput) =>
    ["portal", "applications", "list", input] as const,
  detail: (id: string) => ["portal", "applications", id] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationQueryKeys.all,
    queryFn: clientApplicationService.getAll,
  });
}

export function useOwnApplications(input: ApplicationListInput) {
  return useQuery({
    queryFn: () => clientApplicationService.listOwnApplications(input),
    queryKey: applicationQueryKeys.list(input),
  });
}

export function useOwnApplication(id: string) {
  return useQuery({
    queryFn: () => clientApplicationService.getOwnApplication(id),
    queryKey: applicationQueryKeys.detail(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientApplicationService.createApplication,
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(application.id), application);
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.own });
    },
  });
}

export function useUpdateApplication(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplicationUpdateInput) =>
      clientApplicationService.updateOwnApplication(id, input),
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(id), application);
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.own });
    },
  });
}
