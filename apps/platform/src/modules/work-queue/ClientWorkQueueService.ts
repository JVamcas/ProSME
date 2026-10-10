"use client";

import type { WorkflowEscalationTracking } from "@/modules/workflows/domain/runtime/WorkflowEscalationTracking";
import { requestData, requestJson } from "@/lib/client-http";
import type {
  WorkQueueListInput,
  WorkQueuePage,
  WorkQueueRow,
} from "./WorkQueueTypes";
import type {
  WorkflowActionExecutionRequest,
  WorkflowActionExecutionResult,
} from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import type {
  AuthoritativeEligibilityTaskResult,
  CompleteChecklistTaskInput,
  SaveTaskReviewDraftInput,
  TaskCompletionResult,
  TaskDetail,
} from "./TaskTypes";

export type AuthoritativeEligibilityExecutionResult =
  AuthoritativeEligibilityTaskResult & { rowVersion: number };

type QueueEnvelope = {
  data: WorkQueueRow[];
  page: Omit<WorkQueuePage, "items">;
};

async function list(input: WorkQueueListInput): Promise<WorkQueuePage> {
  const query = new URLSearchParams({
    assignmentScope: input.assignmentScope ?? "assigned",
    limit: String(input.limit),
    scope: input.scope,
  });
  if (input.after) query.set("after", input.after);
  if (input.search) query.set("search", input.search);
  const envelope = await requestJson<QueueEnvelope>(
    `/api/admin/work-queue?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function getTask(taskId: string) {
  return requestData<TaskDetail>(`/api/admin/tasks/${taskId}`, {
    cache: "no-store",
  });
}

function uploadTaskDocument(taskId: string, requirementId: string, file: File) {
  const body = new FormData();
  body.set("requirementId", requirementId);
  body.set("file", file);
  return requestData<TaskDetail>(`/api/admin/tasks/${taskId}/documents`, {
    body,
    method: "POST",
  });
}

function completeTask(taskId: string, input: CompleteChecklistTaskInput) {
  return requestData<TaskCompletionResult>(
    `/api/admin/tasks/${taskId}/complete`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function saveReviewDraft(taskId: string, input: SaveTaskReviewDraftInput) {
  return requestData<{ saved: true }>(
    `/api/admin/tasks/${taskId}/review-draft`,
    {
      body: JSON.stringify(input),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    },
  );
}

function evaluateEligibility(
  taskId: string,
  input: {
    confirmHardFailure?: boolean;
    expectedRowVersion: number;
    expectedResponseRowVersion?: number;
    values?: Record<string, unknown>;
  },
) {
  return requestData<
    AuthoritativeEligibilityExecutionResult | { confirmationRequired: true }
  >(`/api/admin/tasks/${taskId}/eligibility-evaluation`, {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    method: "POST",
  });
}

function executeAction(
  workflowInstanceId: string,
  actionKey: string,
  input: WorkflowActionExecutionRequest,
) {
  return requestData<WorkflowActionExecutionResult>(
    `/api/workflows/${workflowInstanceId}/actions/${actionKey}`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function cancelEscalation(
  taskId: string,
  input: { escalationId: string; expectedRowVersion: number },
) {
  return requestData<{
    taskId: string;
    taskStatus: "PENDING";
    rowVersion: number;
  }>(`/api/admin/tasks/${taskId}/escalation/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

function getEscalationTracking(taskId: string) {
  return requestData<WorkflowEscalationTracking | null>(
    `/api/admin/tasks/${taskId}/escalation`,
    { cache: "no-store" },
  );
}

export const clientWorkQueueService = {
  getEscalationTracking,
  cancelEscalation,
  completeTask,
  saveReviewDraft,
  evaluateEligibility,
  executeAction,
  getTask,
  list,
  uploadTaskDocument,
};
