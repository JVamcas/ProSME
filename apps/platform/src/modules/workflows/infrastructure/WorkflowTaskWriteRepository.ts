import "server-only";

import type { WorkflowTask } from "../domain/runtime/WorkflowTask";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";
import { workflowTasks } from "./workflow-runtime.schema";

export type CreateWorkflowTaskInput = {
  stageInstanceId: string;
  workflowTaskDefinitionId: string;
  reviewerSlot: number;
  formVersionId?: string | null;
  assignedRoleId?: string | null;
  assignedUserId?: string | null;
  dueAt?: Date | null;
  createdAt: Date;
};

const workflowTaskSelection = {
  assignedRoleId: workflowTasks.assignedRoleId,
  assignedUserId: workflowTasks.assignedUserId,
  claimedAt: workflowTasks.claimedAt,
  completedAt: workflowTasks.completedAt,
  createdAt: workflowTasks.createdAt,
  dueAt: workflowTasks.dueAt,
  formVersionId: workflowTasks.formVersionId,
  id: workflowTasks.id,
  rowVersion: workflowTasks.rowVersion,
  reviewerSlot: workflowTasks.reviewerSlot,
  supersedesTaskId: workflowTasks.supersedesTaskId,
  stageInstanceId: workflowTasks.stageInstanceId,
  startedAt: workflowTasks.startedAt,
  status: workflowTasks.status,
  workflowTaskDefinitionId: workflowTasks.workflowTaskDefinitionId,
};

export async function createWorkflowTasks(
  transaction: WorkflowInstanceTransaction,
  inputs: CreateWorkflowTaskInput[],
): Promise<WorkflowTask[]> {
  if (inputs.length === 0) return [];

  return transaction
    .insert(workflowTasks)
    .values(inputs.map((input) => ({
      assignedRoleId: input.assignedRoleId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      claimedAt: input.assignedUserId ? input.createdAt : null,
      createdAt: input.createdAt,
      dueAt: input.dueAt ?? null,
      formVersionId: input.formVersionId ?? null,
      reviewerSlot: input.reviewerSlot,
      stageInstanceId: input.stageInstanceId,
      status: input.assignedUserId ? "CLAIMED" as const : "PENDING" as const,
      workflowTaskDefinitionId: input.workflowTaskDefinitionId,
    })))
    .returning(workflowTaskSelection);
}
