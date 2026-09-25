"use client";

import { requestData } from "@/lib/client-http";

export type WorkflowTaskCoiGate = {
  taskId: string;
  taskName: string;
  taskStatus: string;
  rowVersion: number;
  gated: boolean;
  state: string;
  cleared: boolean;
};

export const clientWorkflowCoiService = {
  get(taskId: string) {
    return requestData<WorkflowTaskCoiGate>(
      `/api/admin/tasks/${taskId}/coi`,
      { cache: "no-store" },
    );
  },
  declare(
    taskId: string,
    input: {
      decision: "NO_CONFLICT" | "DISCLOSE";
      disclosureText?: string;
      expectedRowVersion: number;
    },
  ) {
    return requestData<{ state: string }>(
      `/api/admin/tasks/${taskId}/coi`,
      {
        body: JSON.stringify(input),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
  },
};

