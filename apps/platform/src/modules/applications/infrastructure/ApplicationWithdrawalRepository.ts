import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  stageInstances,
  workflowActionExecutions,
  workflowInstances,
} from "@/db/schema";
import { applyApplicationWithdrawalInTransaction } from "./ApplicationWithdrawalStateRepository";

type WithdrawalInput = {
  actorId: string;
  applicationId: string;
  comment?: string;
  correlationId: string;
  idempotencyKey: string;
  reasonCode?: string;
};

type WithdrawalResult = {
  applicationId: string;
  reference: string;
  withdrawnAt: string;
};

export type WithdrawalOutcome =
  | { kind: "withdrawn"; result: WithdrawalResult }
  | { kind: "not_found" | "unavailable" | "idempotency_conflict" };

function isSameCommand(
  row: Pick<
    typeof workflowActionExecutions.$inferSelect,
    "actorId" | "normalizedInput"
  >,
  input: WithdrawalInput,
) {
  return row.actorId === input.actorId
    && row.normalizedInput.comment === (input.comment ?? null)
    && row.normalizedInput.reasonCode === (input.reasonCode ?? null);
}

async function findWithdrawalReplay(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  input: WithdrawalInput,
): Promise<WithdrawalOutcome | null> {
  const [prior] = await transaction
    .select({
      actionType: workflowActionExecutions.actionType,
      actorId: workflowActionExecutions.actorId,
      normalizedInput: workflowActionExecutions.normalizedInput,
      result: workflowActionExecutions.result,
      workflowInstanceId: workflowActionExecutions.workflowInstanceId,
    })
    .from(workflowActionExecutions)
    .where(eq(workflowActionExecutions.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (!prior) return null;
  const [linked] = await transaction
    .select({ applicationId: workflowInstances.applicationId })
    .from(workflowInstances)
    .where(eq(workflowInstances.id, prior.workflowInstanceId))
    .limit(1);
  if (linked?.applicationId === input.applicationId
    && prior.actionType === "WITHDRAW"
    && isSameCommand(prior, input)) {
    return {
      kind: "withdrawn",
      result: prior.result as WithdrawalResult,
    };
  }
  return { kind: "idempotency_conflict" };
}

export async function withdrawOwnedApplication(
  input: WithdrawalInput,
): Promise<WithdrawalOutcome> {
  return getDatabase().transaction(async (transaction): Promise<WithdrawalOutcome> => {
    const replay = await findWithdrawalReplay(transaction, input);
    if (replay) return replay;

    const [application] = await transaction
      .select({
        id: applications.id,
        reference: applications.reference,
        status: applications.status,
      })
      .from(applications)
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.actorId),
        sql`${applications.deletedAt} IS NULL`,
      ))
      .limit(1);
    if (!application) return { kind: "not_found" };
    if (application.status !== "submitted" || !application.reference) {
      return { kind: "unavailable" };
    }

    const [workflow] = await transaction
      .select({ id: workflowInstances.id, status: workflowInstances.status })
      .from(workflowInstances)
      .where(eq(workflowInstances.applicationId, application.id))
      .limit(1);
    if (!workflow || workflow.status !== "ACTIVE") {
      return { kind: "unavailable" };
    }
    const [activeStage] = await transaction
      .select({
        id: stageInstances.id,
        rowVersion: stageInstances.rowVersion,
      })
      .from(stageInstances)
      .where(and(
        eq(stageInstances.workflowInstanceId, workflow.id),
        eq(stageInstances.status, "ACTIVE"),
      ))
      .limit(1);
    const [lockedApplication] = await transaction
      .select({
        id: applications.id,
        reference: applications.reference,
        rowVersion: applications.rowVersion,
        status: applications.status,
      })
      .from(applications)
      .where(and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.actorId),
        sql`${applications.deletedAt} IS NULL`,
      ))
      .for("update")
      .limit(1);
    const replayAfterLock = await findWithdrawalReplay(transaction, input);
    if (replayAfterLock) return replayAfterLock;
    if (!lockedApplication) return { kind: "not_found" };
    if (lockedApplication.status !== "submitted"
      || !lockedApplication.reference) {
      return { kind: "unavailable" };
    }
    const result = await applyApplicationWithdrawalInTransaction(
      transaction,
      {
        actorId: input.actorId,
        application: {
          id: lockedApplication.id,
          reference: lockedApplication.reference,
          rowVersion: lockedApplication.rowVersion,
        },
        correlationId: input.correlationId,
        reasonCode: input.reasonCode,
        stageId: activeStage?.id,
        workflowId: workflow.id,
        withdrawnAt: new Date(),
      },
    );
    const withdrawnAt = new Date(result.withdrawnAt);
    await transaction.insert(workflowActionExecutions).values({
      actionDefinitionId: null,
      actionKey: "APPLICANT_WITHDRAW",
      actionType: "WITHDRAW",
      actorId: input.actorId,
      actorIdentifier: input.actorId,
      actorType: "USER",
      comment: input.comment ?? null,
      conditionEvaluation: {},
      correlationId: input.correlationId,
      executedAt: withdrawnAt,
      expectedRuntimeVersion: activeStage?.rowVersion ?? 0,
      id: crypto.randomUUID(),
      idempotencyKey: input.idempotencyKey,
      normalizedInput: {
        comment: input.comment ?? null,
        confirmed: true,
        reasonCode: input.reasonCode ?? null,
      },
      reasonCode: input.reasonCode ?? null,
      resolvedTarget: { status: "WITHDRAWN" },
      result,
      resultingRuntimeVersion: activeStage?.rowVersion != null
        ? activeStage.rowVersion + 1
        : 0,
      sourceStageInstanceId: activeStage?.id ?? null,
      workflowInstanceId: workflow.id,
    });
    return { kind: "withdrawn", result };
  }).catch(async (error: unknown) => {
    if (!(error && typeof error === "object"
      && "code" in error && error.code === "23505")) {
      throw error;
    }
    const replay = await getDatabase().transaction((transaction) =>
      findWithdrawalReplay(transaction, input)
    );
    if (replay) return replay;
    throw error;
  });
}
