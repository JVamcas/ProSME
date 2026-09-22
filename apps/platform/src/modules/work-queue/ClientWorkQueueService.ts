"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  TaskClaimResult,
  WorkQueueListInput,
  WorkQueuePage,
  WorkQueueRow,
} from "./WorkQueueTypes";
import type {
  AuthoritativeEligibilityTaskResult,
  CompleteChecklistTaskInput,
  TaskCompletionResult,
  TaskDetail,
} from "./TaskTypes";

type AuthoritativeEligibilityExecutionResult =
  AuthoritativeEligibilityTaskResult & { rowVersion: number };

type QueueEnvelope = {
  data: WorkQueueRow[];
  page: Omit<WorkQueuePage, "items">;
};

async function list(input: WorkQueueListInput): Promise<WorkQueuePage> {
  const query = new URLSearchParams({
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

function claim(task: WorkQueueRow) {
  return requestData<TaskClaimResult>(
    `/api/admin/tasks/${task.taskInstanceId}/claim`,
    {
      body: JSON.stringify({ expectedRowVersion: task.rowVersion }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

function getTask(taskId: string) {
  return requestData<TaskDetail>(`/api/admin/tasks/${taskId}`, {
    cache: "no-store",
  });
}

function completeTask(
  taskId: string,
  input: CompleteChecklistTaskInput,
) {
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

function evaluateEligibility(taskId: string, expectedRowVersion: number) {
  return requestData<AuthoritativeEligibilityExecutionResult>(
    `/api/admin/tasks/${taskId}/eligibility-evaluation`,
    {
      body: JSON.stringify({ expectedRowVersion }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "POST",
    },
  );
}

export const clientWorkQueueService = {
  claim,
  completeTask,
  evaluateEligibility,
  getTask,
  list,
};
