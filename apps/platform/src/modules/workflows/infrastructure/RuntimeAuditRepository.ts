import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  runtimeAuditEventCodes,
  type RuntimeAuditEntry,
  type RuntimeAuditEventCode,
} from "../domain/runtime/RuntimeAuditEvent";
import { workflowAuditEntries } from "./workflow-audit.schema";

export async function listRuntimeAuditTrail(
  workflowInstanceId: string,
): Promise<RuntimeAuditEntry[]> {
  const rows = await getDatabase()
    .select({
      action: workflowAuditEntries.action,
      actorId: workflowAuditEntries.actorId,
      after: workflowAuditEntries.after,
      before: workflowAuditEntries.before,
      correlationId: workflowAuditEntries.correlationId,
      id: workflowAuditEntries.id,
      occurredAt: workflowAuditEntries.createdAt,
      reason: workflowAuditEntries.reason,
      sequence: workflowAuditEntries.runtimeSequence,
      stageInstanceId: workflowAuditEntries.stageInstanceId,
      taskId: workflowAuditEntries.taskId,
      workflowInstanceId: workflowAuditEntries.workflowInstanceId,
    })
    .from(workflowAuditEntries)
    .where(and(
      eq(workflowAuditEntries.workflowInstanceId, workflowInstanceId),
      inArray(workflowAuditEntries.action, runtimeAuditEventCodes),
    ))
    .orderBy(asc(workflowAuditEntries.runtimeSequence));

  return rows.map((row) => ({
    ...row,
    action: row.action as RuntimeAuditEventCode,
    occurredAt: row.occurredAt.toISOString(),
    workflowInstanceId: row.workflowInstanceId!,
  }));
}
