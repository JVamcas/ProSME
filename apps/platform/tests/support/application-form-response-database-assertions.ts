import { expect } from "vitest";

import { createApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import {
  readOwnedApplicationDraftResponse,
  saveApplicationDraftResponse,
} from "@/modules/applications/infrastructure/ApplicationResponseRepository";
import {
  draftOpportunityId,
  firstBusinessId,
  firstOwnerId,
  formVersionId,
} from "./application-database-fixture";

type Query = (text: string, values?: unknown[]) => Promise<unknown>;

export async function assertApplicationDraftCreation(query: Query) {
  const input = {
    actorUserId: firstOwnerId,
    businessId: firstBusinessId,
    correlationId: "90000000-0000-4000-8000-000000000001",
    fundingCallIdOrSlug: draftOpportunityId,
    idempotencyKey: "91000000-0000-4000-8000-000000000001",
    requestFingerprint: "create-fingerprint",
  };
  const created = await createApplicationDraft(input);
  const replayed = await createApplicationDraft(input);
  expect(created.kind).toBe("created");
  expect(replayed).toEqual({
    applicationId: "applicationId" in created ? created.applicationId : "",
    kind: "replayed",
  });
  if (!("applicationId" in created)) throw new Error("Draft was not created.");
  const response = await readOwnedApplicationDraftResponse(
    firstOwnerId,
    created.applicationId,
  );
  expect(response).toMatchObject({
    formVersionId,
    rowVersion: 1,
    values: {},
  });
  const audit = await query(
    `SELECT action, metadata
     FROM app_application_audit_entries
     WHERE application_id = $1`,
    [created.applicationId],
  ) as { rows: Array<{ action: string; metadata: Record<string, unknown> }> };
  expect(audit.rows).toEqual([expect.objectContaining({
    action: "APPLICATION_DRAFT_CREATED",
    metadata: expect.objectContaining({ formVersionId }),
  })]);
  expect(audit.rows[0].metadata).not.toHaveProperty("values");
}

export async function assertApplicationResponseConcurrency(query: Query) {
  const [application] = (await query(
    `SELECT id, row_version
     FROM app_applications
     WHERE funding_opportunity_id = $1 AND owner_user_id = $2`,
    [draftOpportunityId, firstOwnerId],
  ) as { rows: Array<{ id: string; row_version: number }> }).rows;
  const response = await readOwnedApplicationDraftResponse(
    firstOwnerId,
    application.id,
  );
  const input = {
    actorUserId: firstOwnerId,
    applicationId: application.id,
    correlationId: "92000000-0000-4000-8000-000000000001",
    expectedApplicationRowVersion: application.row_version,
    expectedResponseRowVersion: response!.rowVersion,
    idempotencyKey: "93000000-0000-4000-8000-000000000001",
    requestFingerprint: "save-fingerprint",
    values: { NAME: "Persisted on another device" },
  };
  await expect(saveApplicationDraftResponse(input)).resolves.toMatchObject({
    kind: "saved",
  });
  await expect(saveApplicationDraftResponse(input)).resolves.toMatchObject({
    kind: "replayed",
  });
  await expect(saveApplicationDraftResponse({
    ...input,
    idempotencyKey: "94000000-0000-4000-8000-000000000001",
  })).resolves.toMatchObject({
    applicationRowVersion: application.row_version + 1,
    kind: "conflict",
    responseRowVersion: response!.rowVersion + 1,
  });
}
