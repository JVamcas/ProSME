"use client";

import type { WorkflowCoiDeclarationInput } from "./api/WorkflowCoiDeclarationSchema";
import { requestData } from "@/lib/client-http";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

export type WorkflowTaskCoiGate = {
  readOnly?: boolean;
  form: FormRuntimeSchema | null;
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
    input: WorkflowCoiDeclarationInput,
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
