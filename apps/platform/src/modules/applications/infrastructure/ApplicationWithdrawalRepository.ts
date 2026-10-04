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
import { applicantWithdrawalAllowed } from "@/modules/workflows/infrastructure/WorkflowApplicantWithdrawalPolicy";

type WithdrawalInput = {
  actorId: string;
  applicationId: string;
  correlationId: string;
  idempotencyKey: string;
  reason: string;
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
  return (
    row.actorId === input.actorId && row.normalizedInput.reason === input.reason
  );
}

async function findWithdrawalReplay(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
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
  if (
    linked?.applicationId === input.applicationId &&
    prior.actionType === "WITHDRAW" &&
    isSameCommand(prior, input)
  ) {
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
  return getDatabase()
    .transaction(async (transaction): Promise<WithdrawalOutcome> => {
      const replay = await findWithdrawalReplay(transaction, input);
      if (replay) return replay;

      const [application] = await transaction
        .select({
          id: applications.id,
          reference: applications.reference,
          status: applications.status,
        })
        .from(applications)
        .where(
          and(
            eq(applications.id, input.applicationId),
            eq(applications.ownerUserId, input.actorId),
            sql`${applications.deletedAt} IS NULL`,
          ),
        )
        .limit(1);
      if (!application) return { kind: "not_found" };
      if (application.status !== "submitted" || !application.reference) {
        const concurrentReplay = await findWithdrawalReplay(transaction, input);
        if (concurrentReplay) return concurrentReplay;
        return { kind: "unavailable" };
      }

      const [workflow] = await transaction
        .select({ id: workflowInstances.id, status: workflowInstances.status })
        .from(workflowInstances)
        .where(eq(workflowInstances.applicationId, application.id))
        .for("update")
        .limit(1);
      if (!workflow || workflow.status !== "ACTIVE") {
        const concurrentReplay = await findWithdrawalReplay(transaction, input);
        if (concurrentReplay) return concurrentReplay;
        return { kind: "unavailable" };
      }
      // Runtime writers lock the workflow first; preserve that order here too.
      const [lockedApplication] = await transaction
        .select({
          id: applications.id,
          reference: applications.reference,
          rowVersion: applications.rowVersion,
          status: applications.status,
        })
        .from(applications)
        .where(
          and(
            eq(applications.id, input.applicationId),
            eq(applications.ownerUserId, input.actorId),
            sql`${applications.deletedAt} IS NULL`,
          ),
        )
        .for("update")
        .limit(1);
      const replayAfterLock = await findWithdrawalReplay(transaction, input);
      if (replayAfterLock) return replayAfterLock;
      if (!lockedApplication) return { kind: "not_found" };
      if (
        lockedApplication.status !== "submitted" ||
        !lockedApplication.reference
      ) {
        return { kind: "unavailable" };
      }
      const currentStages = await transaction
        .select({
          id: stageInstances.id,
          rowVersion: stageInstances.rowVersion,
        })
        .from(stageInstances)
        .where(
          and(
            eq(stageInstances.workflowInstanceId, workflow.id),
            sql`${stageInstances.status} IN ('ACTIVE', 'BLOCKED')`,
          ),
        )
        .for("update");
      // Lock current branches before evaluating the policy or cancelling their work.
      const [policy] = await transaction
        .select({ allowed: applicantWithdrawalAllowed(workflowInstances) })
        .from(workflowInstances)
        .where(eq(workflowInstances.id, workflow.id))
        .limit(1);
      if (!policy?.allowed) return { kind: "unavailable" };
      const activeStage = currentStages[0];
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
          reason: input.reason,
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
        comment: input.reason,
        conditionEvaluation: {},
        correlationId: input.correlationId,
        executedAt: withdrawnAt,
        expectedRuntimeVersion: activeStage?.rowVersion ?? 0,
        id: crypto.randomUUID(),
        idempotencyKey: input.idempotencyKey,
        normalizedInput: {
          confirmed: true,
          reason: input.reason,
        },
        reason: input.reason ?? null,
        resolvedTarget: { status: "WITHDRAWN" },
        result,
        resultingRuntimeVersion:
          activeStage?.rowVersion != null ? activeStage.rowVersion + 1 : 0,
        sourceStageInstanceId: activeStage?.id ?? null,
        workflowInstanceId: workflow.id,
      });
      return { kind: "withdrawn", result };
    })
    .catch(async (error: unknown) => {
      if (!(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      )) {
        throw error;
      }
      const replay = await getDatabase().transaction((transaction) =>
        findWithdrawalReplay(transaction, input),
      );
      if (replay) return replay;
      throw error;
    });
}
