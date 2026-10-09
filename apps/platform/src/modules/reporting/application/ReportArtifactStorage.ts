import "server-only";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { StreamingDocumentStorage } from "@/integrations/storage/StreamingDocumentStorage";
import type { ReportRun } from "../domain/Report";
import type { PendingReportOutput } from "../infrastructure/ReportRunWorkerRepository";
import { registerReportErrorArtifact } from "../infrastructure/ReportRunWorkerRepository";
import { reportArtifactByteLimit } from "../infrastructure/ReportExportWriter";

export async function verifyStoredReportArtifact(
  storage: StreamingDocumentStorage,
  artifact: PendingReportOutput,
  signal: AbortSignal,
) {
  const stream = storage.readStream(artifact.objectKey);
  const hash = createHash("sha256");
  let bytes = 0;
  const abort = () =>
    stream.destroy(new Error("Artifact verification timed out."));
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    for await (const chunk of stream) {
      bytes += chunk.length;
      if (bytes > reportArtifactByteLimit) {
        return false;
      }
      hash.update(chunk);
    }
    return bytes === artifact.bytes && hash.digest("hex") === artifact.checksum;
  } catch (error) {
    if ((error as { code?: number }).code === 404) {
      return false;
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    stream.destroy();
  }
}
export async function persistReportErrorArtifact(
  storage: StreamingDocumentStorage,
  run: ReportRun,
) {
  const body = Buffer.from(
    `Report generation failed\nRun: ${run.id}\n${run.error ?? "Generation could not be completed."}\n`,
  );
  const artifact: PendingReportOutput = {
    kind: "ERROR",
    objectKey: `reporting/runs/${run.id}/error.txt`,
    filename: `report-${run.id}-error.txt`,
    contentType: "text/plain; charset=utf-8",
    bytes: body.length,
    checksum: createHash("sha256").update(body).digest("hex"),
    rows: 0,
  };
  await storage.putStream({
    ...artifact,
    body: Readable.from(body),
    signal: AbortSignal.timeout(15000),
  });
  await registerReportErrorArtifact(run, artifact);
}
