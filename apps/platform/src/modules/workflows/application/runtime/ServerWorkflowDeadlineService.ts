import "server-only";

import { AuthenticationRequiredError, PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { logger } from "@/integrations/monitoring/logger";
import { systemSeedUserId } from "@/platform/database/SystemSeedPrincipal";
import type { WorkflowDeadlineBatchResult, WorkflowDeadlineCandidate } from "../../domain/runtime/WorkflowDeadline";
import { claimWorkflowActionRuntimeVersion } from "../../infrastructure/WorkflowActionExecutionRepository";
import { lockStageCompletionTarget } from "../../infrastructure/StageCompletionRepository";
import {
  loadDueWorkflowDeadlines,
  lockWorkflowDeadline,
  recordWorkflowDeadlineResult,
  withWorkflowDeadlineTransaction,
  workflowProcessorHasPermission,
} from "../../infrastructure/WorkflowDeadlineRepository";
import { appendWorkflowDeadlineAudit, lockDeadlineRfi, lockDeadlineTask } from "../../infrastructure/WorkflowDeadlineActionRepository";
import { loadWorkflowDeadlineNotificationSnapshot } from "../../infrastructure/WorkflowDeadlineNotificationRepository";
import { resumeDueWorkflowDeferral } from "../../infrastructure/WorkflowDeferralRepository";
import { expireDueWorkflowRfi } from "../../infrastructure/WorkflowRfiLifecycleRepository";
import { executeWorkflowDeadlineAction } from "./ServerWorkflowDeadlineActionService";
import { captureWorkflowDeadlineNotification } from "./ServerWorkflowDeadlineNotificationService";
import {
  getWorkflowProcessorConfiguration,
  isAuthorizedWorkflowProcessorRequest,
} from "./WorkflowProcessorConfiguration";

async function processDeadline(
  candidate: WorkflowDeadlineCandidate,
  correlationId: string,
  now: Date,
  stopAt: number,
) {
  return withWorkflowDeadlineTransaction(async (transaction) => {
    if (!await workflowProcessorHasPermission(transaction)) {
      throw new PermissionDeniedError(permissionCodes.workflowDeadlineAllProcess);
    }
    if (!await lockWorkflowDeadline(transaction, candidate)) return false;
    const stage = await lockStageCompletionTarget(transaction, candidate.stageInstanceId, ["ACTIVE", "BLOCKED"]);
    if (!stage || stage.workflowInstanceId !== candidate.workflowInstanceId) return false;
    if (!await lockDeadlineTask(transaction, candidate)) return false;
    // Recheck due state after locking: a reviewer may have answered/resumed work
    // between batch selection and this transaction.
    const [current] = await loadDueWorkflowDeadlines(now, 1, transaction, candidate.occurrenceKey);
    if (!current) return false;
    const rfi = candidate.kind === "RFI_EXPIRED" || candidate.kind === "RFI_REMINDER"
      ? await lockDeadlineRfi(transaction, candidate)
      : undefined;
    const sourceSnapshot = rfi?.expiryAction === "RETURN"
      ? await loadWorkflowDeadlineNotificationSnapshot(transaction, candidate.stageInstanceId)
      : undefined;
    if (candidate.kind === "SLA_BREACH") {
      await executeWorkflowDeadlineAction(transaction, {
        actionType: "ESCALATE", candidate, correlationId, occurredAt: now, stage,
      });
    }
    if (rfi && candidate.kind === "RFI_EXPIRED") {
      await expireDueWorkflowRfi(transaction, {
        actorId: systemSeedUserId,
        actorType: "SYSTEM",
        correlationId,
        occurredAt: now,
        requestInformationId: candidate.sourceId,
      });
      if (rfi.expiryAction !== "CLOSE_REQUEST") {
        await executeWorkflowDeadlineAction(transaction, {
          actionType: rfi.expiryAction,
          candidate,
          correlationId,
          occurredAt: now,
          stage,
        });
      }
    }
    if (candidate.kind === "DEFERRAL_RESUMED") {
      const resumed = await resumeDueWorkflowDeferral(transaction, {
        actorId: systemSeedUserId,
        actionExecutionId: null,
        correlationId,
        resumedAt: now,
        stageInstanceId: candidate.stageInstanceId,
        taskId: candidate.taskId,
        workflowInstanceId: candidate.workflowInstanceId,
      });
      if (!resumed) throw new Error("The due deferral could not be resumed.");
    }
    const version = await claimWorkflowActionRuntimeVersion(
      transaction, candidate.stageInstanceId, stage.rowVersion!, ["ACTIVE", "BLOCKED", "CANCELLED"],
    );
    if (!version) throw new Error("The workflow changed during deadline processing.");
    await appendWorkflowDeadlineAudit(transaction, current, correlationId, now);
    await captureWorkflowDeadlineNotification(transaction, current, correlationId, now, rfi, sourceSnapshot);
    if (Date.now() >= stopAt) throw new Error("Workflow processor execution budget exhausted.");
    await recordWorkflowDeadlineResult(transaction, current, now);
    return true;
  });
}

export async function processConfiguredWorkflowDeadlineBatch(
  authorizationHeader: string | null,
  correlationId: string,
): Promise<WorkflowDeadlineBatchResult> {
  const configuration = getWorkflowProcessorConfiguration();
  if (!isAuthorizedWorkflowProcessorRequest(authorizationHeader, configuration.WORKFLOW_PROCESSOR_SECRET)) {
    throw new AuthenticationRequiredError();
  }
  if (!await workflowProcessorHasPermission()) {
    throw new PermissionDeniedError(permissionCodes.workflowDeadlineAllProcess);
  }
  const now = new Date();
  const stopAt = Date.now() + configuration.WORKFLOW_PROCESSOR_EXECUTION_TIMEOUT_MS;
  const candidates = await loadDueWorkflowDeadlines(now, configuration.WORKFLOW_PROCESSOR_BATCH_SIZE);
  const result = { claimed: 0, failed: 0, processed: 0, skipped: 0 };
  // Writes are ordered so related deadlines from a single workflow cannot race.
  // The notification processor runs independently in the scheduler.
  for (const candidate of candidates) {
    if (Date.now() >= stopAt) break;
    result.claimed += 1;
    try {
      if (await processDeadline(candidate, correlationId, now, stopAt)) result.processed += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      logger.error("workflow.deadline.failed", {
        correlationId,
        kind: candidate.kind,
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      await withWorkflowDeadlineTransaction((transaction) =>
        recordWorkflowDeadlineResult(transaction, candidate, null, "PROCESSING_FAILED")
      );
    }
  }
  return result;
}
