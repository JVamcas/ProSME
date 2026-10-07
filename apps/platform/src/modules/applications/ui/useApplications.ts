"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ApplicationSubmissionCommandInput } from "../api/ApplicationSubmissionSchemas";
import type { ApplicationWithdrawalInput } from "../api/ApplicationWithdrawalSchemas";

import type { SaveApplicationDraftInput } from "../ApplicationSchemas";
import type {
  AdminApplicationListInput,
  ApplicationListInput,
} from "../ApplicationTypes";
import { clientApplicationService } from "../ClientApplicationService";

import { applicationQueryKeys } from "./ApplicationQueryKeys";
import {
  ownApplicationReadViewQuery,
  staffApplicationDetailQuery,
} from "./ApplicationDetailQueries";
import { invalidateApplicationViews } from "./invalidateApplicationViews";
import { workQueueQueryKeys } from "@/modules/work-queue/ui/WorkQueueQueryKeys";
import { toast } from "@/shared/ui/Toast";
export { applicationQueryKeys } from "./ApplicationQueryKeys";

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

export function useAdminApplicationDetail(id: string) {
  return useQuery({ ...staffApplicationDetailQuery(id), enabled: Boolean(id) });
}

export function useOwnApplicationReadView(id: string) {
  return useQuery({ ...ownApplicationReadViewQuery(id), enabled: Boolean(id) });
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

export function useOwnApplicationStatus(id: string) {
  return useQuery({
    queryFn: () => clientApplicationService.getOwnApplicationStatus(id),
    queryKey: applicationQueryKeys.status(id),
  });
}

export function useOwnApplicationStatusHistory(id: string) {
  return useInfiniteQuery({
    queryKey: applicationQueryKeys.statusHistory(id),
    queryFn: ({ pageParam }) =>
      clientApplicationService.getOwnApplicationStatusHistory(
        id,
        pageParam ?? undefined,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientApplicationService.createApplication,
    onError: (error) => {
      toast.error("Application could not be started", {
        description: error.message,
      });
    },
    onSuccess: (application) => {
      queryClient.setQueryData(
        applicationQueryKeys.detail(application.id),
        application,
      );
      void invalidateApplicationViews(queryClient);
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
      void invalidateApplicationViews(queryClient);
    },
  });
}

export function useSubmitApplication(id: string, fundingCallId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplicationSubmissionCommandInput) =>
      clientApplicationService.submitApplication(id, input, fundingCallId),
    onSuccess: () => invalidateApplicationViews(queryClient, true),
  });
}

export function useDeleteApplicationDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientApplicationService.deleteApplicationDraft,
    onSuccess: ({ id }) => {
      queryClient.removeQueries({ queryKey: applicationQueryKeys.detail(id) });
      queryClient.removeQueries({
        queryKey: applicationQueryKeys.adminDetail(id),
      });
      queryClient.removeQueries({
        queryKey: [...workQueueQueryKeys.all, "workflow-progress", id],
      });
      void invalidateApplicationViews(queryClient, true);
    },
  });
}

export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: {
      id: string;
      input: ApplicationWithdrawalInput;
      idempotencyKey: string;
    }) =>
      clientApplicationService.withdrawApplication(
        command.id,
        command.input,
        command.idempotencyKey,
      ),
    onSuccess: () => invalidateApplicationViews(queryClient, true),
  });
}
