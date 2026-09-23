"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SaveApplicationDraftInput } from "./ApplicationSchemas";
import type {
  AdminApplicationListInput,
  ApplicationListInput,
} from "./ApplicationTypes";
import { clientApplicationService } from "./ClientApplicationService";

export const applicationQueryKeys = {
  all: ["applications"] as const,
  own: ["portal", "applications"] as const,
  list: (input: ApplicationListInput) =>
    ["portal", "applications", "list", input] as const,
  detail: (id: string) => ["portal", "applications", id] as const,
  admin: ["admin", "applications"] as const,
  adminList: (input: AdminApplicationListInput) =>
    ["admin", "applications", input] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationQueryKeys.all,
    queryFn: clientApplicationService.getAll,
  });
}

export function useAdminApplications(input: AdminApplicationListInput) {
  return useQuery({
    queryFn: () => clientApplicationService.listAdminApplications(input),
    queryKey: applicationQueryKeys.adminList(input),
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
    mutationFn: (input: SaveApplicationDraftInput) =>
      clientApplicationService.saveApplicationDraft(id, input),
    onSuccess: (application) => {
      queryClient.setQueryData(applicationQueryKeys.detail(id), application);
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.own });
      void queryClient.invalidateQueries({
        queryKey: ["portal", "applications", id, "readiness"],
      });
    },
  });
}

export function useSubmitApplication(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clientApplicationService.submitApplication(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.own });
      void queryClient.invalidateQueries({ queryKey: applicationQueryKeys.detail(id) });
    },
  });
}
