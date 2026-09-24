"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { clientFormsService } from "./ClientFormsService";
import { workQueueQueryKeys } from "@/modules/work-queue/WorkQueueHooks";
import type {
  CreateFormInput,
  FormListInput,
  TaskFormSubmissionInput,
  UpdateFormInput,
} from "./api/FormTransportTypes";
import type { TaskFormData } from "./FormTypes";

type CompleteTaskFormInput = TaskFormSubmissionInput & {
  actionKey: string | null;
};

export const formQueryKeys = {
  all: ["admin", "forms"] as const,
  list: (input: FormListInput) => [
    "admin",
    "forms",
    "list",
    input.page,
    input.pageSize,
  ] as const,
  detail: (id: string) => ["admin", "forms", id] as const,
  task: (id: string) => ["admin", "tasks", id, "form"] as const,
  publishedRuntime: (versionId: string) =>
    ["admin", "forms", "published", versionId] as const,
};

export function useForms(input: FormListInput) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: formQueryKeys.list(input),
    queryFn: () => clientFormsService.list(input),
  });
}

export function useFormEditor(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: formQueryKeys.detail(id),
    queryFn: () => clientFormsService.get(id),
  });
}

export function usePublishedForms() {
  return useQuery({
    queryKey: [...formQueryKeys.all, "published"],
    queryFn: clientFormsService.listPublished,
  });
}

export function usePublishedFormRuntime(versionId: string | null) {
  return useQuery({
    enabled: Boolean(versionId),
    queryKey: formQueryKeys.publishedRuntime(versionId ?? ""),
    queryFn: () => clientFormsService.getPublishedRuntime(versionId!),
  });
}

export function useCreateForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFormInput) => clientFormsService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.all });
    },
  });
}

export function useUpdateForm(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFormInput) => clientFormsService.update(id, input),
    onSuccess: (view) => {
      queryClient.setQueryData(formQueryKeys.detail(id), view);
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.all });
    },
  });
}

export function useFormLifecycle(action: "publish" | "retire") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      definitionId: string;
      expectedRowVersion: number;
      versionId: string;
    }) => clientFormsService.lifecycle(
      input.definitionId,
      action,
      input.versionId,
      input.expectedRowVersion,
    ),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: formQueryKeys.detail(input.definitionId),
      });
    },
  });
}

export function useCloneForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      definitionId: string;
      sourceVersionId: string;
    }) => clientFormsService.clone(
      input.definitionId,
      input.sourceVersionId,
    ),
    onSuccess: (view, input) => {
      queryClient.setQueryData(
        formQueryKeys.detail(input.definitionId),
        view,
      );
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.all });
    },
  });
}

export function useTaskForm(taskId: string) {
  return useQuery({
    enabled: Boolean(taskId),
    queryKey: formQueryKeys.task(taskId),
    queryFn: () => clientFormsService.getTaskForm(taskId),
  });
}

export function useSaveTaskForm(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskFormSubmissionInput) =>
      clientFormsService.saveTaskForm(taskId, input),
    onSuccess: (response) => {
      queryClient.setQueryData<TaskFormData>(
        formQueryKeys.task(taskId),
        (current) => current ? { ...current, response } : current,
      );
    },
  });
}

export function useCompleteTaskForm(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteTaskFormInput) =>
      clientFormsService.completeTaskForm(taskId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.task(taskId) });
      void queryClient.invalidateQueries({ queryKey: workQueueQueryKeys.all });
    },
  });
}
