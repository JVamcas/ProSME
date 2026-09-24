import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { WorkflowPublicStatusMapping } from "../domain/definitions/WorkflowStageDefinition";

import {
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

type ActivatedTask = {
  assignedRoleId: string | null;
  assignedUserId: string | null;
  dueAt: Date | null;
  id: string;
  status: string;
  typeSnapshot: string;
  workflowTaskDefinitionId: string;
};

export async function appendStageActivationAudit(
  transaction: WorkflowInstanceTransaction,
  input: {
    actorId: string;
    correlationId: string;
    iterationNumber: number;
    stageDefinitionId: string;
    stageId: string;
    stageKey: string;
    publicStatus: WorkflowPublicStatusMapping;
    tasks: ActivatedTask[];
    workflowInstanceId: string;
  },
) {
  const payload = {
    iterationNumber: input.iterationNumber,
    stageDefinitionId: input.stageDefinitionId,
    stageKey: input.stageKey,
    taskIds: input.tasks.map((task) => task.id),
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "STAGE_ACTIVATED",
    payload,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "STAGE_ACTIVATED",
    actorId: input.actorId,
    after: payload,
    before: null,
    correlationId: input.correlationId,
    stageInstanceId: input.stageId,
    targetId: input.stageId,
    targetType: "WORKFLOW_STAGE_INSTANCE",
    workflowInstanceId: input.workflowInstanceId,
  });
  const [previous] = await transaction
    .select({ after: workflowAuditEntries.after })
    .from(workflowAuditEntries)
    .where(and(
      eq(workflowAuditEntries.workflowInstanceId, input.workflowInstanceId),
      eq(workflowAuditEntries.action, "PUBLIC_STATUS_CHANGED"),
    ))
    .orderBy(desc(workflowAuditEntries.runtimeSequence))
    .limit(1);
  if (JSON.stringify(previous?.after) !== JSON.stringify(input.publicStatus)) {
    await transaction.insert(workflowAuditEntries).values({
      action: "PUBLIC_STATUS_CHANGED",
      actorId: input.actorId,
      after: input.publicStatus,
      before: previous?.after ?? null,
      correlationId: input.correlationId,
      stageInstanceId: input.stageId,
      targetId: input.workflowInstanceId,
      targetType: "WORKFLOW_INSTANCE",
      workflowInstanceId: input.workflowInstanceId,
    });
    await transaction.insert(workflowEvents).values({
      actorId: input.actorId,
      correlationId: input.correlationId,
      eventCode: "PUBLIC_STATUS_CHANGED",
      payload: input.publicStatus,
      workflowInstanceId: input.workflowInstanceId,
    });
  }
  const taskEvents = input.tasks.flatMap((task) => {
    const created = {
      action: "TASK_CREATED",
      actorId: input.actorId,
      after: {
        assignedRoleId: task.assignedRoleId,
        assignedUserId: task.assignedUserId,
        dueAt: task.dueAt?.toISOString() ?? null,
        status: task.status,
        taskDefinitionId: task.workflowTaskDefinitionId,
        type: task.typeSnapshot,
      },
      before: null,
      correlationId: input.correlationId,
      stageInstanceId: input.stageId,
      targetId: task.id,
      targetType: "WORKFLOW_TASK",
      taskId: task.id,
      workflowInstanceId: input.workflowInstanceId,
    };
    if (!task.assignedRoleId && !task.assignedUserId) return [created];
    return [created, {
      ...created,
      action: "TASK_ASSIGNED",
      after: {
        assignedRoleId: task.assignedRoleId,
        assignedUserId: task.assignedUserId,
      },
      reason: "Configured task assignment",
    }];
  });
  if (!taskEvents.length) return;
  await transaction.insert(workflowAuditEntries).values(taskEvents);
  await transaction.insert(workflowEvents).values(taskEvents.map((event) => ({
    actorId: event.actorId,
    correlationId: event.correlationId,
    eventCode: event.action,
    payload: {
      ...event.after,
      stageInstanceId: event.stageInstanceId,
      taskId: event.taskId,
    },
    workflowInstanceId: event.workflowInstanceId,
  })));
}
