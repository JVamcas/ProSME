import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { stageTaskInstances } from "@/modules/workflows/infrastructure/workflow-runtime.schema";
import { formSubmissions } from "./form-response.schema";

export type SaveDraftFormResponseInput = {
  actorId: string;
  taskInstanceId: string;
  formVersionId: string;
  expectedTaskRowVersion: number;
  expectedSubmissionRowVersion?: number;
  values: Record<string, unknown>;
};

type LockedTask = Pick<
  typeof stageTaskInstances.$inferSelect,
  "assignmentUserId" | "formVersionId" | "rowVersion" | "status"
>;

type FormResponse = typeof formSubmissions.$inferSelect;

type DatabaseTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export async function readFormResponse(
  taskInstanceId: string,
  formVersionId: string,
) {
  const [response] = await getDatabase()
    .select()
    .from(formSubmissions)
    .where(and(
      eq(formSubmissions.taskInstanceId, taskInstanceId),
      eq(formSubmissions.formVersionId, formVersionId),
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
      assignmentUserId: stageTaskInstances.assignmentUserId,
      formVersionId: stageTaskInstances.formVersionId,
      rowVersion: stageTaskInstances.rowVersion,
      status: stageTaskInstances.status,
    })
    .from(stageTaskInstances)
    .where(eq(stageTaskInstances.id, input.taskInstanceId))
    .for("update")
    .limit(1);
  return task ?? null;
}

function taskIsEditable(
  task: LockedTask | null,
  input: SaveDraftFormResponseInput,
) {
  const editable = ["READY", "CLAIMED", "IN_PROGRESS"].includes(
    task?.status ?? "",
  );
  return Boolean(
    task
      && task.assignmentUserId === input.actorId
      && task.formVersionId === input.formVersionId
      && task.rowVersion === input.expectedTaskRowVersion
      && editable,
  );
}

async function lockResponse(
  transaction: DatabaseTransaction,
  taskInstanceId: string,
): Promise<FormResponse | null> {
  const [response] = await transaction
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.taskInstanceId, taskInstanceId))
    .for("update")
    .limit(1);
  return response ?? null;
}

function responseIsWritable(
  response: FormResponse | null,
  input: SaveDraftFormResponseInput,
) {
  if (!response) {
    return input.expectedSubmissionRowVersion === undefined;
  }
  return response.status === "DRAFT"
    && response.formVersionId === input.formVersionId
    && response.rowVersion === input.expectedSubmissionRowVersion;
}

async function insertDraftResponse(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
) {
  const [created] = await transaction
    .insert(formSubmissions)
    .values({
      createdBy: input.actorId,
      formVersionId: input.formVersionId,
      status: "DRAFT",
      taskInstanceId: input.taskInstanceId,
      updatedBy: input.actorId,
      values: input.values,
    })
    .returning();
  return created;
}

async function updateDraftResponse(
  transaction: DatabaseTransaction,
  input: SaveDraftFormResponseInput,
  current: FormResponse,
) {
  const [updated] = await transaction
    .update(formSubmissions)
    .set({
      rowVersion: current.rowVersion + 1,
      updatedAt: new Date(),
      updatedBy: input.actorId,
      values: input.values,
    })
    .where(and(
      eq(formSubmissions.id, current.id),
      eq(formSubmissions.rowVersion, current.rowVersion),
      eq(formSubmissions.status, "DRAFT"),
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

  const current = await lockResponse(transaction, input.taskInstanceId);
  if (!responseIsWritable(current, input)) return null;

  return current
    ? updateDraftResponse(transaction, input, current)
    : insertDraftResponse(transaction, input);
}

export async function saveDraftFormResponse(
  input: SaveDraftFormResponseInput,
) {
  return getDatabase().transaction((transaction) =>
    saveDraftInTransaction(transaction, input),
  );
}
