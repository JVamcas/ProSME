import "server-only";

import type { StageInstance } from "../domain/runtime/StageInstance";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";
import { stageInstances } from "./workflow-runtime.schema";

export type CreateStageInstanceInput = {
  workflowInstanceId: string;
  workflowStageDefinitionId: string;
  iterationNumber?: number;
  referralContext?: Record<string, unknown> | null;
  returnContext?: Record<string, unknown> | null;
  activatedAt: Date;
};

export async function createStageInstance(
  transaction: WorkflowInstanceTransaction,
  input: CreateStageInstanceInput,
): Promise<StageInstance> {
  const [instance] = await transaction
    .insert(stageInstances)
    .values({
      activatedAt: input.activatedAt,
      iterationNumber: input.iterationNumber ?? 1,
      referralContext: input.referralContext ?? null,
      returnContext: input.returnContext ?? null,
      workflowInstanceId: input.workflowInstanceId,
      workflowStageDefinitionId: input.workflowStageDefinitionId,
    })
    .returning({
      activatedAt: stageInstances.activatedAt,
      completedAt: stageInstances.completedAt,
      id: stageInstances.id,
      iterationNumber: stageInstances.iterationNumber,
      referralContext: stageInstances.referralContext,
      returnContext: stageInstances.returnContext,
      status: stageInstances.status,
      workflowInstanceId: stageInstances.workflowInstanceId,
      workflowStageDefinitionId:
        stageInstances.workflowStageDefinitionId,
    });

  return instance;
}
