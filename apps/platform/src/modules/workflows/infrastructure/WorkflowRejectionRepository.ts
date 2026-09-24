import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import {
  stageInstances,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowTasks,
} from "@/db/schema";
import type { RejectConfiguration } from "../domain/actions/WorkflowActionConfiguration";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";

type TerminalRejectConfiguration = Extract<
  RejectConfiguration["outcome"],
  { type: "TERMINAL" }
>;

export type TerminalRejectionResult = {
  cancelledStageInstanceIds: string[];
  cancelledTaskIds: string[];
};

export async function rejectTerminalWorkflow(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    configuration: TerminalRejectConfiguration;
    correlationId: string;
    rejectedAt: Date;
    sourceStageInstanceId: string;
    terminalOutcome: string;
    workflowInstanceId: string;
  },
): Promise<TerminalRejectionResult | null> {
  const cancelledTasks = input.configuration.cancelOpenTasks
    ? await transaction
        .update(workflowTasks)
        .set({
          completedAt: input.rejectedAt,
          rowVersion: sql`${workflowTasks.rowVersion} + 1`,
          status: "CANCELLED",
        })
        .where(and(
          sql`${workflowTasks.status} NOT IN ('COMPLETED', 'CANCELLED')`,
          sql`EXISTS (
            SELECT 1
            FROM app_workflow_stage_instances rejection_stage
            WHERE rejection_stage.id = ${workflowTasks.stageInstanceId}
              AND rejection_stage.workflow_instance_id = ${input.workflowInstanceId}::uuid
          )`,
        ))
        .returning({ id: workflowTasks.id })
    : [];

  const cancelledStages = input.configuration.cancelOpenStageInstances
    ? await transaction
        .update(stageInstances)
        .set({
          completedAt: input.rejectedAt,
          rowVersion: sql`${stageInstances.rowVersion} + 1`,
          status: "CANCELLED",
        })
        .where(and(
          eq(stageInstances.workflowInstanceId, input.workflowInstanceId),
          inArray(stageInstances.status, ["NOT_STARTED", "ACTIVE", "BLOCKED"]),
        ))
        .returning({ id: stageInstances.id })
    : [];

  const [rejected] = await transaction
    .update(workflowInstances)
    .set({
      completedAt: input.rejectedAt,
      publicStatus: input.configuration.publicStatusMapping,
      status: "REJECTED",
      terminalOutcome: input.terminalOutcome,
    })
    .where(and(
      eq(workflowInstances.id, input.workflowInstanceId),
      eq(workflowInstances.status, "ACTIVE"),
    ))
    .returning({ id: workflowInstances.id });
  if (!rejected) return null;

  const result = {
    cancelledStageInstanceIds: cancelledStages.map((stage) => stage.id),
    cancelledTaskIds: cancelledTasks.map((task) => task.id),
  };
  const eventPayload = {
    ...result,
    publicStatus: input.configuration.publicStatusMapping.status,
    sourceStageInstanceId: input.sourceStageInstanceId,
    terminalOutcome: input.terminalOutcome,
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "WORKFLOW_REJECTED",
    payload: eventPayload,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "WORKFLOW_REJECTED",
    actorId: input.actorId,
    after: {
      ...eventPayload,
      completedAt: input.rejectedAt.toISOString(),
      status: "REJECTED",
    },
    before: { completedAt: null, status: "ACTIVE" },
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
    targetId: input.workflowInstanceId,
    targetType: "WORKFLOW_INSTANCE",
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "PUBLIC_STATUS_CHANGED",
    actorId: input.actorId,
    after: input.configuration.publicStatusMapping,
    before: null,
    correlationId: input.correlationId,
    targetId: input.workflowInstanceId,
    targetType: "WORKFLOW_INSTANCE",
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "PUBLIC_STATUS_CHANGED",
    payload: input.configuration.publicStatusMapping,
    workflowInstanceId: input.workflowInstanceId,
  });
  return result;
}
