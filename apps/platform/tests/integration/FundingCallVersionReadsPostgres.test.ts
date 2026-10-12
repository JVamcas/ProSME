import { installFundingCallVersionReadDatabaseFixture } from "../support/FundingCallVersionReadDatabaseFixture";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { readPublicFundingCallById } from "@/modules/funding-calls/infrastructure/PublicFundingCallRepository";
import { updateFundingCallPublicInteraction } from "@/modules/funding-calls/infrastructure/FundingCallPublicInteractionRepository";
import { createApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import { readApplicationFundingCallConfiguration } from "@/modules/applications/infrastructure/ApplicationFundingCallRepository";
import { isFundingCallEffectivelyOpen } from "@/modules/funding-calls/domain/FundingCallLifecycle";
import {
  listFundingCallVersions,
  readHistoricalFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import { readFundingCallDetail } from "@/modules/funding-calls/infrastructure/FundingCallDetailRepository";

const url = process.env.FUNDING_VERSION_READ_TEST_DATABASE_URL;

describe.skipIf(!url)("funding version read projections on PostgreSQL", () => {
  const fixture = installFundingCallVersionReadDatabaseFixture();
  const { callId, otherId, pagedId, publicationIds, draftId, statements } =
    fixture;

  it("audits interaction changes atomically and rejects stale concurrent writes", async () => {
    const actorId = randomUUID();
    expect(
      await updateFundingCallPublicInteraction(actorId, callId, {
        enabled: false,
        expectedRowVersion: 1,
      }),
    ).toMatchObject({ publicInteractionEnabled: false, rowVersion: 2 });
    expect(
      await updateFundingCallPublicInteraction(actorId, callId, {
        enabled: true,
        expectedRowVersion: 1,
      }),
    ).toBeNull();
    expect(
      (
        await fixture.pool.query(
          "SELECT action FROM app_authorization_audit_entries",
        )
      ).rows,
    ).toEqual([{ action: "funding_call.public_interaction.disabled" }]);
    expect(await readPublicFundingCallById(callId)).toMatchObject({
      publicInteractionEnabled: false,
    });
    const configuration = await readApplicationFundingCallConfiguration(
      callId,
      publicationIds[3],
    );
    expect(configuration?.publicInteractionEnabled).toBe(false);
    expect(isFundingCallEffectivelyOpen(configuration!, new Date())).toBe(
      false,
    );
    expect(
      await createApplicationDraft({
        actorUserId: actorId,
        fundingCallIdOrSlug: callId,
        correlationId: randomUUID(),
        idempotencyKey: randomUUID(),
        requestFingerprint: randomUUID(),
      }),
    ).toEqual({ kind: "unavailable" });
    await fixture.pool.query(
      "ALTER TABLE app_authorization_audit_entries ADD CONSTRAINT block_enable_audit CHECK (action <> 'funding_call.public_interaction.enabled') NOT VALID",
    );
    await expect(
      updateFundingCallPublicInteraction(actorId, callId, {
        enabled: true,
        expectedRowVersion: 2,
      }),
    ).rejects.toThrow();
    expect(
      (
        await fixture.pool.query(
          "SELECT public_interaction_enabled, row_version FROM app_funding_calls WHERE id = $1",
          [callId],
        )
      ).rows[0],
    ).toEqual({ public_interaction_enabled: false, row_version: 2 });
    await fixture.pool.query(
      "ALTER TABLE app_authorization_audit_entries DROP CONSTRAINT block_enable_audit",
    );
    expect(
      await updateFundingCallPublicInteraction(actorId, callId, {
        enabled: true,
        expectedRowVersion: 2,
      }),
    ).toMatchObject({ publicInteractionEnabled: true, rowVersion: 3 });
    expect(
      (
        await fixture.pool.query(
          "SELECT status, current_published_version_id FROM app_funding_calls WHERE id = $1",
          [callId],
        )
      ).rows[0],
    ).toEqual({
      status: "LIVE",
      current_published_version_id: publicationIds[3],
    });
  });

  it("projects every version with the working version first and accurate statuses", async () => {
    const result = await listFundingCallVersions(callId, 1);
    expect(result.total).toBe(5);
    expect(result.items.map((row) => row.versionNumber)).toEqual([
      null,
      4,
      3,
      2,
      1,
    ]);
    expect(result.items[0]).toMatchObject({
      id: draftId,
      kind: "working",
      status: "DRAFT",
      publishedAt: null,
      sourceVersionNumber: 2,
    });
    expect(result.items[1]).toMatchObject({ status: "LIVE", current: true });
    expect(result.items[2]).toMatchObject({
      status: "SUPERSEDED",
      current: false,
    });
    expect(result.items[1].publishedAt).toMatch(/^\d{4}-/);
    expect(result.items[0]).not.toHaveProperty("snapshot");
    expect(result.items[0]).not.toHaveProperty("description");
    for (const status of ["APPROVAL_PENDING", "APPROVED"]) {
      await fixture.pool.query(
        "UPDATE app_funding_call_draft_versions SET status = $1 WHERE id = $2",
        [status, draftId],
      );
      expect((await listFundingCallVersions(callId, 1)).items[0].status).toBe(
        status,
      );
    }
  });

  it("resolves source, current and historical version numbers in one detail query each", async () => {
    statements.length = 0;
    const detail = await readFundingCallDetail(callId);
    expect(detail?.call).toMatchObject({
      currentPublishedVersionNumber: 4,
      sourcePublishedVersionNumber: 2,
      draftVersionId: draftId,
    });
    expect(statements).toHaveLength(1);
    statements.length = 0;
    const historical = await readHistoricalFundingCall(
      callId,
      publicationIds[1],
    );
    expect(historical).toMatchObject({
      viewedPublishedVersionNumber: 2,
      currentPublishedVersionNumber: 4,
    });
    expect(statements).toHaveLength(1);
    expect(
      await readHistoricalFundingCall(otherId, publicationIds[1]),
    ).toBeNull();
  });

  it("includes initial unpublished calls and filters unrelated calls", async () => {
    expect(await listFundingCallVersions(otherId, 1)).toMatchObject({
      total: 1,
      items: [
        { id: otherId, kind: "working", versionNumber: null, status: "DRAFT" },
      ],
    });
    expect(await listFundingCallVersions(randomUUID(), 1)).toMatchObject({
      total: 0,
      items: [],
    });
  });

  it("paginates and counts all versions in SQL across full, partial and empty pages", async () => {
    const first = await listFundingCallVersions(pagedId, 1);
    expect(first.items.map((row) => row.versionNumber)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
    ]);
    expect(first.items[0].status).toBe("CLOSED");
    const second = await listFundingCallVersions(pagedId, 2);
    expect(second.items.map((row) => row.versionNumber)).toEqual([2, 1]);
    expect(second.total).toBe(12);
    expect(await listFundingCallVersions(pagedId, 3)).toMatchObject({
      total: 12,
      items: [],
    });
  });
});
