"use client";

import { requestData } from "@/lib/client-http";
import type {
  FormDefinitionSummary,
  FormEditorView,
  FormRuntimeSchema,
  FormSubmission,
  PublishedFormOption,
} from "./FormTypes";
import type {
  CreateFormInput,
  TaskFormSubmissionInput,
  UpdateFormInput,
} from "./api/FormTransportTypes";

type CompleteTaskFormInput = TaskFormSubmissionInput & { actionKey: string };

const jsonHeaders = { "Content-Type": "application/json" };

function list() {
  return requestData<FormDefinitionSummary[]>("/api/admin/forms", {
    cache: "no-store",
  });
}

function create(input: CreateFormInput) {
  return requestData<FormEditorView>("/api/admin/forms", {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "POST",
  });
}

function get(id: string) {
  return requestData<FormEditorView>(`/api/admin/forms/${id}`, {
    cache: "no-store",
  });
}

function listPublished() {
  return requestData<PublishedFormOption[]>("/api/admin/forms/published", {
    cache: "no-store",
  });
}

function getPublishedRuntime(versionId: string) {
  return requestData<FormRuntimeSchema>(
    `/api/admin/forms/published/${versionId}`,
    { cache: "no-store" },
  );
}

function update(id: string, input: UpdateFormInput) {
  return requestData<FormEditorView>(`/api/admin/forms/${id}`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
}

function clone(id: string, sourceVersionId: string) {
  return requestData<FormEditorView>(`/api/admin/forms/${id}/clone`, {
    body: JSON.stringify({ sourceVersionId }),
    headers: jsonHeaders,
    method: "POST",
  });
}

function lifecycle(
  id: string,
  action: "publish" | "retire",
  versionId: string,
  expectedRowVersion: number,
) {
  return requestData<unknown>(`/api/admin/forms/${id}/${action}`, {
    body: JSON.stringify({ expectedRowVersion, versionId }),
    headers: jsonHeaders,
    method: "POST",
  });
}

function getTaskForm(taskId: string) {
  return requestData<{
    schema: FormRuntimeSchema;
    submission: FormSubmission | null;
    taskRowVersion: number;
  }>(`/api/admin/tasks/${taskId}/form`, { cache: "no-store" });
}

function saveTaskForm(taskId: string, input: TaskFormSubmissionInput) {
  return requestData<FormSubmission>(`/api/admin/tasks/${taskId}/form`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
}

function completeTaskForm(taskId: string, input: CompleteTaskFormInput) {
  return requestData<{
    actionKey: string;
    nextStageName: string | null;
    rowVersion: number;
    taskInstanceId: string;
    taskStatus: "COMPLETED";
    workflowStatus: "ACTIVE" | "COMPLETED";
  }>(`/api/admin/tasks/${taskId}/form`, {
    body: JSON.stringify(input),
    headers: {
      ...jsonHeaders,
      "Idempotency-Key": crypto.randomUUID(),
    },
    method: "POST",
  });
}

export const clientFormsService = {
  clone,
  create,
  completeTaskForm,
  get,
  getTaskForm,
  getPublishedRuntime,
  lifecycle,
  list,
  listPublished,
  saveTaskForm,
  update,
};
