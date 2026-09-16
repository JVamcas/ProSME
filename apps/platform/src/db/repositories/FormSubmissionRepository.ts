import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { formSubmissions, stageTaskInstances } from "@/db/schema";

type SubmissionInput = {
  actorId: string;
  taskInstanceId: string;
  formVersionId: string;
  expectedTaskRowVersion: number;
  expectedSubmissionRowVersion?: number;
  values: Record<string, unknown>;
  status: "DRAFT" | "COMPLETED";
};

type LockedTask = Pick<
  typeof stageTaskInstances.$inferSelect,
  "assignmentUserId" | "formVersionId" | "rowVersion" | "status"
>;

type Submission = typeof formSubmissions.$inferSelect;

type DbTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

async function lockTask(
  transaction: DbTransaction,
  input: SubmissionInput,
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

function taskIsEditable(task: LockedTask | null, input: SubmissionInput) {
  const editable = ["READY", "CLAIMED", "IN_PROGRESS"].includes(
    task?.status ?? "",
  );
  return Boolean(
    task &&
      task.assignmentUserId === input.actorId &&
      task.formVersionId === input.formVersionId &&
      task.rowVersion === input.expectedTaskRowVersion &&
      editable,
  );
}

async function lockSubmission(
  transaction: DbTransaction,
  input: SubmissionInput,
): Promise<Submission | null> {
  const [submission] = await transaction
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.taskInstanceId, input.taskInstanceId))
    .for("update")
    .limit(1);
  return submission ?? null;
}

function submissionIsWritable(
  submission: Submission | null,
  input: SubmissionInput,
) {
  return Boolean(
    !submission ||
      (submission.status !== "COMPLETED" &&
        submission.rowVersion === input.expectedSubmissionRowVersion),
  );
}

async function insertSubmission(
  transaction: DbTransaction,
  input: SubmissionInput,
) {
  const [created] = await transaction
    .insert(formSubmissions)
    .values({
      createdBy: input.actorId,
      formVersionId: input.formVersionId,
      status: input.status,
      taskInstanceId: input.taskInstanceId,
      updatedBy: input.actorId,
      values: input.values,
      completedAt: input.status === "COMPLETED" ? new Date() : null,
    })
    .returning();
  return created;
}

async function updateSubmission(
  transaction: DbTransaction,
  input: SubmissionInput,
  current: Submission,
) {
  const [updated] = await transaction
    .update(formSubmissions)
    .set({
      completedAt:
        input.status === "COMPLETED" ? new Date() : current.completedAt,
      rowVersion: current.rowVersion + 1,
      status: input.status,
      updatedAt: new Date(),
      updatedBy: input.actorId,
      values: input.values,
    })
    .where(
      and(
        eq(formSubmissions.id, current.id),
        eq(formSubmissions.rowVersion, input.expectedSubmissionRowVersion ?? 1),
      ),
    )
    .returning();
  return updated ?? null;
}

async function saveSubmissionInTransaction(
  transaction: DbTransaction,
  input: SubmissionInput,
) {
  const task = await lockTask(transaction, input);
  if (!taskIsEditable(task, input)) return null;
  const current = await lockSubmission(transaction, input);
  if (!submissionIsWritable(current, input)) return null;
  return current
    ? updateSubmission(transaction, input, current)
    : insertSubmission(transaction, input);
}

export async function saveSubmission(input: SubmissionInput) {
  return getDatabase().transaction((transaction) =>
    saveSubmissionInTransaction(transaction, input),
  );
}
