import "server-only";

import { getDatabase } from "@/db/client";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

export function withWorkflowActionExecutionTransaction<T>(
  work: (transaction: WorkflowActionExecutionTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export function workflowActionExecutionDatabase() {
  return getDatabase();
}
