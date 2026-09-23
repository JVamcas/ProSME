import "server-only";

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
