"use client";

import { requestData } from "@/lib/client-http";
import type {
  WorkflowRfiDetail,
  WorkflowRfiSummary,
} from "../../domain/runtime/WorkflowRfiView";

function applicantBase(applicationId: string) {
  return `/api/portal/applications/${applicationId}/requests`;
}

function listOwned(applicationId: string) {
  return requestData<WorkflowRfiSummary[]>(applicantBase(applicationId), {
    cache: "no-store",
  });
}

function getOwned(applicationId: string, requestId: string) {
  return requestData<WorkflowRfiDetail>(
    `${applicantBase(applicationId)}/${requestId}`,
    { cache: "no-store" },
  );
}

function saveDraft(
  applicationId: string,
  requestId: string,
  input: {
    expectedRowVersion: number;
    fieldValues: Record<string, unknown>;
  },
) {
  return requestData<{ rowVersion: number; updatedAt: string }>(
    `${applicantBase(applicationId)}/${requestId}`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

function respond(
  applicationId: string,
  requestId: string,
  input: {
    evidenceVersionIds: string[];
    expectedRowVersion: number;
    fieldValues: Record<string, unknown>;
  },
) {
  return requestData<{
    requestInformationId: string;
    responseId: string;
    rowVersion: number;
    status: "RESPONDED";
  }>(`${applicantBase(applicationId)}/${requestId}`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    method: "POST",
  });
}

function uploadDocument(
  applicationId: string,
  requestId: string,
  requirementId: string,
  file: File,
) {
  const body = new FormData();
  body.set("requirementId", requirementId);
  body.set("file", file);
  return requestData<WorkflowRfiDetail>(
    `${applicantBase(applicationId)}/${requestId}/documents`,
    { body, method: "POST" },
  );
}

function listTask(taskId: string) {
  return requestData<WorkflowRfiSummary[]>(
    `/api/admin/tasks/${taskId}/requests`,
    { cache: "no-store" },
  );
}

function getTask(taskId: string, requestId: string) {
  return requestData<WorkflowRfiDetail>(
    `/api/admin/tasks/${taskId}/requests/${requestId}`,
    { cache: "no-store" },
  );
}

function followUp(taskId: string, requestId: string, message: string) {
  return requestData<{ correspondenceId: string }>(
    `/api/admin/tasks/${taskId}/requests/${requestId}/follow-ups`,
    {
      body: JSON.stringify({ message }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

function close(taskId: string, requestId: string, expectedRowVersion: number) {
  return requestData<{ rowVersion: number; status: "CLOSED" }>(
    `/api/admin/tasks/${taskId}/requests/${requestId}/close`,
    {
      body: JSON.stringify({ expectedRowVersion }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export const clientWorkflowRfiService = {
  close,
  followUp,
  getOwned,
  getTask,
  listOwned,
  listTask,
  respond,
  saveDraft,
  uploadDocument,
};
