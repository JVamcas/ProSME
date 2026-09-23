import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applicationAuditEntries,
  applicationCommands,
  applicationDraftResponses,
  applications,
} from "./application.schema";
import {
  applicationCommandMatches,
  type ApplicationTransaction,
  findApplicationCommand,
} from "./ApplicationCommandRepository";

type SaveDraftInput = {
  actorUserId: string;
  applicationId: string;
  correlationId: string;
  expectedApplicationRowVersion: number;
  expectedResponseRowVersion: number;
  idempotencyKey: string;
  requestFingerprint: string;
  values: Record<string, unknown>;
};

export type SaveDraftResult =
  | { applicationId: string; kind: "replayed" | "saved" }
  | {
      applicationRowVersion?: number;
      kind: "conflict" | "idempotency_conflict" | "not_found" | "not_writable";
      responseRowVersion?: number;
    };

export async function readOwnedApplicationDraftResponse(
  actorUserId: string,
  applicationId: string,
) {
  const [response] = await getDatabase()
    .select({
      formVersionId: applicationDraftResponses.formVersionId,
      id: applicationDraftResponses.id,
      rowVersion: applicationDraftResponses.rowVersion,
      updatedAt: applicationDraftResponses.updatedAt,
      values: applicationDraftResponses.values,
    })
    .from(applicationDraftResponses)
    .innerJoin(
      applications,
      eq(applications.latestDraftResponseId, applicationDraftResponses.id),
    )
    .where(and(
      eq(applications.id, applicationId),
      eq(applications.ownerUserId, actorUserId),
      isNull(applications.deletedAt),
      eq(applicationDraftResponses.respondentUserId, actorUserId),
    ))
    .limit(1);
  return response ?? null;
}

async function saveDraftInTransaction(
  transaction: ApplicationTransaction,
  input: SaveDraftInput,
): Promise<SaveDraftResult> {
  const replay = await findApplicationCommand(
    transaction,
    input.actorUserId,
    input.idempotencyKey,
  );
  if (replay) {
    return applicationCommandMatches(
      replay,
      "SAVE_DRAFT_RESPONSE",
      input.requestFingerprint,
      input.applicationId,
    )
      ? { applicationId: replay.applicationId, kind: "replayed" }
      : { kind: "idempotency_conflict" };
  }
  const [application] = await transaction
    .select()
    .from(applications)
    .where(and(
      eq(applications.id, input.applicationId),
      eq(applications.ownerUserId, input.actorUserId),
      isNull(applications.deletedAt),
    ))
    .for("update")
    .limit(1);
  if (!application) return { kind: "not_found" };
  const [response] = await transaction
    .select()
    .from(applicationDraftResponses)
    .where(and(
      eq(applicationDraftResponses.id, application.latestDraftResponseId!),
      eq(applicationDraftResponses.applicationId, application.id),
      eq(applicationDraftResponses.respondentUserId, input.actorUserId),
    ))
    .for("update")
    .limit(1);
  if (
    application.status !== "draft"
    || !response
    || response.formVersionId !== application.formVersionId
  ) {
    return { kind: "not_writable" };
  }
  if (
    application.rowVersion !== input.expectedApplicationRowVersion
    || response.rowVersion !== input.expectedResponseRowVersion
  ) {
    return {
      applicationRowVersion: application.rowVersion,
      kind: "conflict",
      responseRowVersion: response.rowVersion,
    };
  }
  const now = new Date();
  await transaction
    .update(applicationDraftResponses)
    .set({
      rowVersion: response.rowVersion + 1,
      updatedAt: now,
      values: input.values,
    })
    .where(eq(applicationDraftResponses.id, response.id));
  await transaction
    .update(applications)
    .set({ rowVersion: application.rowVersion + 1, updatedAt: now })
    .where(eq(applications.id, application.id));
  await transaction.insert(applicationCommands).values({
    actorUserId: input.actorUserId,
    applicationId: application.id,
    commandType: "SAVE_DRAFT_RESPONSE",
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
  });
  await transaction.insert(applicationAuditEntries).values({
    action: "APPLICATION_DRAFT_SAVED",
    actorUserId: input.actorUserId,
    applicationId: application.id,
    correlationId: input.correlationId,
    metadata: {
      applicationRowVersion: application.rowVersion + 1,
      changedFieldKeys: Object.keys(input.values).sort(),
      formVersionId: response.formVersionId,
      responseRowVersion: response.rowVersion + 1,
    },
  });
  return { applicationId: application.id, kind: "saved" };
}

export function saveApplicationDraftResponse(input: SaveDraftInput) {
  return getDatabase().transaction((transaction) =>
    saveDraftInTransaction(transaction, input),
  );
}
