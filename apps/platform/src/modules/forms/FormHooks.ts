"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientFormsService } from "./ClientFormsService";
import type {
  CreateFormInput,
  TaskFormSubmissionInput,
  UpdateFormInput,
} from "./api/FormTransportTypes";
import type { TaskFormData } from "./FormTypes";

export const formQueryKeys = {
  all: ["admin", "forms"] as const,
  detail: (id: string) => ["admin", "forms", id] as const,
  task: (id: string) => ["admin", "tasks", id, "form"] as const,
};

export function useForms() {
  return useQuery({
    queryKey: formQueryKeys.all,
    queryFn: clientFormsService.list,
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

export function useCloneForm(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceVersionId: string) =>
      clientFormsService.clone(id, sourceVersionId),
    onSuccess: (view) => {
      queryClient.setQueryData(formQueryKeys.detail(id), view);
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
    onSuccess: (submission) => {
      queryClient.setQueryData<TaskFormData>(
        formQueryKeys.task(taskId),
        (current) => current ? { ...current, submission } : current,
      );
    },
  });
}

export function useCompleteTaskForm(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskFormSubmissionInput) =>
      clientFormsService.completeTaskForm(taskId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formQueryKeys.task(taskId) });
    },
  });
}
