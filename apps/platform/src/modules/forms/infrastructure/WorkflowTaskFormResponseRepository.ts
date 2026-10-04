import "server-only";

import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { workflowTasks } from "@/modules/workflows/infrastructure/workflow-runtime.schema";
import { formResponses } from "./form-response.schema";

// Read the current assignee's response for this exact task and pinned version.
export async function readWorkflowTaskFormResponse(taskId: string, versionId: string) {
  const [response] = await getDatabase()
    .select({
      id: formResponses.id,
      workflowTaskId: formResponses.workflowTaskId,
      formVersionId: formResponses.formVersionId,
      respondentUserId: formResponses.respondentUserId,
      status: formResponses.status,
      values: formResponses.values,
      definitionSnapshot: formResponses.definitionSnapshot,
      rowVersion: formResponses.rowVersion,
      completedAt: formResponses.completedAt,
    })
    .from(formResponses)
    .innerJoin(workflowTasks, and(
      eq(workflowTasks.id, formResponses.workflowTaskId),
      eq(workflowTasks.assignedUserId, formResponses.respondentUserId),
      eq(workflowTasks.formVersionId, formResponses.formVersionId),
    ))
    .where(and(
      eq(formResponses.workflowTaskId, taskId),
      eq(formResponses.formVersionId, versionId),
    ))
    .limit(1);
  return response ?? null;
}
