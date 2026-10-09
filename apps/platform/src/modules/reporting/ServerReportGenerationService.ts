import { reportTemplateQuery } from "./domain/ReportDefinition";
import "server-only";
import { GoogleCloudDocumentStorage } from "@/integrations/storage/GoogleCloudDocumentStorage";
import type { StreamingDocumentStorage } from "@/integrations/storage/StreamingDocumentStorage";
import {
  requirePermission,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { RequestValidationError } from "@/lib/resource-errors";
import { ReportFinalizationPendingError } from "./domain/ReportGenerationRecovery";
import { ReportQueryValidationError } from "./domain/ReportQueryLimits";
import {
  claimReportRun,
  checkpointReportOutput,
  completeReportRun,
  deferReportSource,
  failReportRun,
  listMissingReportErrorArtifacts,
  startReportRun,
  type ClaimedReportRun,
  type PendingReportOutput,
} from "./infrastructure/ReportRunWorkerRepository";
import { removeAbandonedReportTemporaryFiles } from "./infrastructure/ReportTemporaryFiles";
import { findReportingPrincipal } from "./infrastructure/ReportPrincipalRepository";
import {
  createReportExport,
  reportArtifactContentTypes,
} from "./infrastructure/ReportExportWriter";
import { requireReportSourceAccess } from "./application/ReportAccess";
import {
  persistReportErrorArtifact,
  verifyStoredReportArtifact,
} from "./application/ReportArtifactStorage";
import { prepareReportWebsiteSource } from "./application/PrepareReportWebsiteSource";
import { streamReportQuery } from "./ServerReportQueryService";

function safeGenerationError(error: unknown) {
  if (error instanceof PermissionDeniedError) {
    return "The execution principal no longer has report or source access.";
  }
  if (
    error instanceof RequestValidationError ||
    error instanceof ReportQueryValidationError
  ) {
    return error.message;
  }
  return "Report generation or private file persistence failed. Retry with a new run after the issue is resolved.";
}
async function generateClaimedRun(
  run: ClaimedReportRun,
  storage: StreamingDocumentStorage,
) {
  const signal = AbortSignal.timeout(90000);
  const actor = await findReportingPrincipal(run.actorId);
  requirePermission(actor, permissionCodes.reportingReportRunAll);
  requirePermission(actor, permissionCodes.reportingQueryExecuteAll);
  await requireReportSourceAccess(actor, run.definition);
  if (
    run.pendingOutput &&
    (await verifyStoredReportArtifact(storage, run.pendingOutput, signal))
  ) {
    return finalizeStoredOutput(run, run.pendingOutput);
  }
  if (!(await prepareReportWebsiteSource(run))) {
    if (run.sourceDeadline && Date.parse(run.sourceDeadline) < Date.now()) {
      throw new RequestValidationError(
        "The exact-period source could not be prepared within 24 hours. Retry this period after source recovery.",
      );
    }
    await deferReportSource(run);
    return false;
  }
  if (!(await startReportRun(run))) {
    return false;
  }
  const writer = await createReportExport(run.definition, run.format, signal);
  try {
    const definition = reportTemplateQuery(run.definition);
    const websitePeriod =
      definition.datasetKey === "website-analytics"
        ? {
            startDate: run.values.startDate as string,
            endDate: run.values.endDate as string,
          }
        : undefined;
    await streamReportQuery(
      actor,
      {
        ...definition,
        values: run.values,
        ...(websitePeriod ? { websitePeriod } : {}),
      },
      writer.onBatch,
      run,
    );
    const generated = await writer.finish();
    const pending: PendingReportOutput = {
      kind: "OUTPUT",
      objectKey: `reporting/runs/${run.id}/${run.leaseToken}/output.${run.format.toLowerCase()}`,
      filename: `report-${run.id}.${run.format.toLowerCase()}`,
      contentType: reportArtifactContentTypes[run.format],
      bytes: generated.bytes,
      checksum: generated.checksum,
      rows: generated.rows,
    };
    // A durable checkpoint before upload makes a crash after upload recoverable.
    if (!(await checkpointReportOutput(run, pending))) {
      return false;
    }
    try {
      await storage.putStream({ ...pending, body: writer.read(), signal });
    } catch (error) {
      await storage.delete(pending.objectKey).catch(() => undefined);
      throw error;
    }
    const completed = await finalizeStoredOutput(run, pending);
    if (
      completed &&
      run.pendingOutput &&
      run.pendingOutput.objectKey !== pending.objectKey
    ) {
      await storage.delete(run.pendingOutput.objectKey).catch(() => undefined);
    }
    return completed;
  } finally {
    await writer.dispose();
  }
}
async function finalizeStoredOutput(
  run: ClaimedReportRun,
  pending: PendingReportOutput,
) {
  try {
    return await completeReportRun(run, pending);
  } catch {
    // Keep the checkpoint and lease: a later claim verifies the saved checksum
    // and completes this same run without querying mutable sources again.
    throw new ReportFinalizationPendingError();
  }
}

let activeWorkers = 0;
export async function processReportGeneration(
  storage: StreamingDocumentStorage = new GoogleCloudDocumentStorage(),
) {
  if (activeWorkers >= 2) {
    return { claimed: 0, succeeded: 0, failed: 0, preparing: 0 };
  }
  activeWorkers++;
  try {
    return await processOneReportRun(storage);
  } finally {
    activeWorkers--;
  }
}
async function processOneReportRun(
  storage: StreamingDocumentStorage = new GoogleCloudDocumentStorage(),
) {
  await removeAbandonedReportTemporaryFiles().catch(() => undefined);
  // Error artifact persistence is retryable independently of terminal generation state.
  for (const failed of await listMissingReportErrorArtifacts()) {
    await persistReportErrorArtifact(storage, failed).catch(() => undefined);
  }
  const run = await claimReportRun();
  if (!run) {
    return { claimed: 0, succeeded: 0, failed: 0, preparing: 0 };
  }
  try {
    const completed = await generateClaimedRun(run, storage);
    return {
      claimed: 1,
      succeeded: completed ? 1 : 0,
      failed: 0,
      preparing: completed ? 0 : 1,
    };
  } catch (error) {
    if (error instanceof ReportFinalizationPendingError) {
      return { claimed: 1, succeeded: 0, failed: 0, preparing: 1 };
    }
    const message = safeGenerationError(error);
    const failed = await failReportRun(run, message);
    if (failed) {
      await persistReportErrorArtifact(storage, {
        ...run,
        error: message,
      }).catch(() => undefined);
      if (run.pendingOutput) {
        await storage
          .delete(run.pendingOutput.objectKey)
          .catch(() => undefined);
      }
    }
    return { claimed: 1, succeeded: 0, failed: failed ? 1 : 0, preparing: 0 };
  }
}
