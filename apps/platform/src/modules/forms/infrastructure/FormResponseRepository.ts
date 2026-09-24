import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { workflowAuditEntries } from "@/modules/workflows/infrastructure/workflow-audit.schema";
import { workflowTasks } from "@/modules/workflows/infrastructure/workflow-runtime.schema";
import { formResponses } from "./form-response.schema";

export type SaveDraftFormResponseInput = {
  actorId: string;
  correlationId: string;
  workflowTaskId: string;
  formVersionId: string;
  expectedTaskRowVersion: number;
  expectedResponseRowVersion?: number;
  values: Record<string, unknown>;
};

type LockedTask = Pick<
  typeof workflowTasks.$inferSelect,
  "assignedUserId" | "formVersionId" | "rowVersion" | "status"
>;

type FormResponse = typeof formResponses.$inferSelect;

type DatabaseTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export async function readFormResponse(
  actorId: string,
  workflowTaskId: string,
  formVersionId: string,
) {
  const [response] = await getDatabase()
    .select()
    .from(formResponses)
    .where(and(
      eq(formResponses.respondentUserId, actorId),
      eq(formResponses.workflowTaskId, workflowTaskId),
      eq(formResponses.formVersionId, formVersionId),
    ))
    .limit(1);
  return response ?? null;
}

async function lockTask(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
): Promise<LockedTask | null> {
  const [task] = await transaction
    .select({
      assignedUserId: workflowTasks.assignedUserId,
      formVersionId: workflowTasks.formVersionId,
      rowVersion: workflowTasks.rowVersion,
      status: workflowTasks.status,
    })
    .from(workflowTasks)
    .where(eq(workflowTasks.id, input.workflowTaskId))
    .for("update")
    .limit(1);
  return task ?? null;
}

function taskIsEditable(
  task: LockedTask | null,
  input: SaveDraftFormResponseInput,
) {
  const editable = ["CLAIMED", "IN_PROGRESS"].includes(
    task?.status ?? "",
  );
  return Boolean(
    task
      && task.assignedUserId === input.actorId
      && task.formVersionId === input.formVersionId
      && task.rowVersion === input.expectedTaskRowVersion
      && editable,
  );
}

async function lockResponse(
  transaction: DatabaseTransaction,
  actorId: string,
  workflowTaskId: string,
): Promise<FormResponse | null> {
  const [response] = await transaction
    .select()
    .from(formResponses)
    .where(and(
      eq(formResponses.respondentUserId, actorId),
      eq(formResponses.workflowTaskId, workflowTaskId),
    ))
    .for("update")
    .limit(1);
  return response ?? null;
}

function responseIsWritable(
  response: FormResponse | null,
  input: SaveDraftFormResponseInput,
) {
  if (!response) {
    return input.expectedResponseRowVersion === undefined;
  }
  return response.status === "DRAFT"
    && response.formVersionId === input.formVersionId
    && response.rowVersion === input.expectedResponseRowVersion;
}

async function insertDraftResponse(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
) {
  const [created] = await transaction
    .insert(formResponses)
    .values({
      createdBy: input.actorId,
      formVersionId: input.formVersionId,
      respondentUserId: input.actorId,
      status: "DRAFT",
      workflowTaskId: input.workflowTaskId,
      updatedBy: input.actorId,
      values: input.values,
    })
    .onConflictDoNothing({
      target: [
        formResponses.workflowTaskId,
        formResponses.respondentUserId,
      ],
    })
    .returning();
  return created ?? null;
}

async function updateDraftResponse(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
  current: FormResponse,
) {
  const [updated] = await transaction
    .update(formResponses)
    .set({
      rowVersion: current.rowVersion + 1,
      updatedAt: new Date(),
      updatedBy: input.actorId,
      values: input.values,
    })
    .where(and(
      eq(formResponses.id, current.id),
      eq(formResponses.rowVersion, current.rowVersion),
      eq(formResponses.status, "DRAFT"),
    ))
    .returning();
  return updated ?? null;
}

async function saveDraftInTransaction(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
) {
  const task = await lockTask(transaction, input);
  if (!taskIsEditable(task, input)) return null;

  const current = await lockResponse(
    transaction,
    input.actorId,
    input.workflowTaskId,
  );
  if (!responseIsWritable(current, input)) return null;

  const saved = await (current
    ? updateDraftResponse(transaction, input, current)
    : insertDraftResponse(transaction, input));
  if (!saved) return null;
  await transaction.insert(workflowAuditEntries).values({
    action: current ? "FORM_RESPONSE_UPDATED" : "FORM_RESPONSE_CREATED",
    actorId: input.actorId,
    after: {
      formVersionId: saved.formVersionId,
      respondentUserId: saved.respondentUserId,
      rowVersion: saved.rowVersion,
      status: saved.status,
      values: saved.values,
      workflowTaskId: saved.workflowTaskId,
    },
    before: current
      ? {
          formVersionId: current.formVersionId,
          respondentUserId: current.respondentUserId,
          rowVersion: current.rowVersion,
          status: current.status,
          values: current.values,
          workflowTaskId: current.workflowTaskId,
        }
      : null,
    correlationId: input.correlationId,
    targetId: saved.id,
    targetType: "FORM_RESPONSE",
  });
  return saved;
}

export async function saveDraftFormResponse(
  input: SaveDraftFormResponseInput,
) {
  return getDatabase().transaction((transaction) =>
    saveDraftInTransaction(transaction, input),
  );
}
