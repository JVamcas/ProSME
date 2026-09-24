import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deleteOwnedApplicationDraft } from "@/modules/applications/infrastructure/ApplicationDeletionRepository";
import {
  createOwnedApplication,
  findOwnedApplication,
  findOwnedApplicationByOpportunity,
  listOwnedApplications,
} from "@/modules/applications/infrastructure/ApplicationRepository";
import { createPendingApplicationDocumentVersion } from "@/modules/applications/infrastructure/ApplicationDocumentRepository";
import {
  draftOpportunityId,
  eligibilityRuleSetVersionId,
  firstOwnerId,
  formVersionId,
  secondOwnerId,
  seedApplicationDatabaseFixture,
} from "../support/application-database-fixture";

const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

beforeAll(async () => {
  if (!pool) return;
  await seedApplicationDatabaseFixture((text, values) => pool.query(text, values));
});

afterAll(async () => {
  await pool?.end();
});

const describeDatabase = enabled ? describe : describe.skip;

describeDatabase("draft deletion in PostgreSQL", () => {
  it("hides only an owned draft, preserves audit, and releases its duplicate slot", async () => {
    const id = await createOwnedApplication({
      duplicatePolicy: "one_per_business",
      eligibilityRuleSetVersionId,
      formVersionId,
      fundingOpportunityId: draftOpportunityId,
      fundingOpportunityTitle: "Draft Autosave Fund",
      ownerUserId: firstOwnerId,
    });
    expect(id).toBeTruthy();
    const input = {
      applicationId: id!,
      correlationId: crypto.randomUUID(),
    };

    await expect(deleteOwnedApplicationDraft({
      ...input,
      actorId: secondOwnerId,
    })).resolves.toBe("not_found");
    await expect(findOwnedApplication(firstOwnerId, id!)).resolves.toBeTruthy();

    await expect(deleteOwnedApplicationDraft({
      ...input,
      actorId: firstOwnerId,
    })).resolves.toBe("deleted");
    await expect(deleteOwnedApplicationDraft({
      ...input,
      actorId: firstOwnerId,
    })).resolves.toBe("not_found");
    await expect(findOwnedApplication(firstOwnerId, id!)).resolves.toBeNull();
    await expect(findOwnedApplicationByOpportunity(
      firstOwnerId,
      draftOpportunityId,
    )).resolves.toBeNull();
    const listed = await listOwnedApplications({
      limit: 10,
      ownerUserId: firstOwnerId,
    });
    expect(listed.total).toBe(0);

    const audit = await pool!.query(
      `SELECT action FROM app_application_audit_entries
       WHERE application_id = $1 AND action = 'APPLICATION_DRAFT_DELETED'`,
      [id],
    );
    expect(audit.rows).toEqual([{ action: "APPLICATION_DRAFT_DELETED" }]);
    await expect(createPendingApplicationDocumentVersion({
      applicationId: id!,
      checksumSha256: "a".repeat(64),
      contentType: "application/pdf",
      extension: ".pdf",
      objectKey: `${firstOwnerId}/${id}/late-upload.pdf`,
      originalName: "late-upload.pdf",
      ownerUserId: firstOwnerId,
      requirementKey: "REGISTRATION",
      sizeBytes: 512,
    })).resolves.toBeNull();

    const replacementId = await createOwnedApplication({
      duplicatePolicy: "one_per_business",
      eligibilityRuleSetVersionId,
      formVersionId,
      fundingOpportunityId: draftOpportunityId,
      fundingOpportunityTitle: "Draft Autosave Fund",
      ownerUserId: firstOwnerId,
    });
    expect(replacementId).toBeTruthy();
    expect(replacementId).not.toBe(id);
  });
});
