"use client";

import { requestData, requestJson } from "@/lib/client-http";
import type {
  WorkflowCoiReviewDecision,
  WorkflowCoiReviewDetail,
  WorkflowCoiReviewListInput,
  WorkflowCoiReviewPage,
  WorkflowCoiReviewRow,
} from "./api/WorkflowCoiReviewTypes";

type ReviewListEnvelope = {
  data: WorkflowCoiReviewRow[];
  page: Omit<WorkflowCoiReviewPage, "items">;
};

async function list(
  input: WorkflowCoiReviewListInput,
): Promise<WorkflowCoiReviewPage> {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.search) query.set("search", input.search);
  const envelope = await requestJson<ReviewListEnvelope>(
    `/api/admin/conflict-reviews?${query.toString()}`,
    { cache: "no-store" },
  );
  return { items: envelope.data, ...envelope.page };
}

function get(taskId: string) {
  return requestData<WorkflowCoiReviewDetail>(
    `/api/admin/tasks/${taskId}/coi/review`,
    { cache: "no-store" },
  );
}

function decide(taskId: string, input: WorkflowCoiReviewDecision) {
  return requestData<{ replacementTaskId?: string; state: string }>(
    `/api/admin/tasks/${taskId}/coi`,
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      method: "PATCH",
    },
  );
}

export const clientWorkflowCoiReviewService = { decide, get, list };
