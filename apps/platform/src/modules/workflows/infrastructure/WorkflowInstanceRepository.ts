import "server-only";

import type { getDatabase } from "@/db/client";
import type { WorkflowInstance } from "../domain/runtime/WorkflowInstance";
import { workflowInstances } from "./workflow-runtime.schema";

export type WorkflowInstanceTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

type CreateWorkflowInstanceInput = {
  applicationId: string;
  workflowTemplateVersionId: string;
  startedAt: Date;
};

export async function createWorkflowInstance(
  transaction: WorkflowInstanceTransaction,
  input: CreateWorkflowInstanceInput,
): Promise<WorkflowInstance> {
  const [instance] = await transaction
    .insert(workflowInstances)
    .values({
      applicationId: input.applicationId,
      createdAt: input.startedAt,
      startedAt: input.startedAt,
      workflowTemplateVersionId: input.workflowTemplateVersionId,
    })
    .returning({
      applicationId: workflowInstances.applicationId,
      completedAt: workflowInstances.completedAt,
      createdAt: workflowInstances.createdAt,
      id: workflowInstances.id,
      publicStatus: workflowInstances.publicStatus,
      startedAt: workflowInstances.startedAt,
      status: workflowInstances.status,
      terminalOutcome: workflowInstances.terminalOutcome,
      workflowTemplateVersionId:
        workflowInstances.workflowTemplateVersionId,
    });

  return instance;
}
