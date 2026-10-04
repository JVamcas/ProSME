import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallNotificationRepository", () => ({
  captureFundingCallNotification: vi.fn(),
}));

import { getDatabase } from "@/db/client";
import { fundingCallUpdateSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import * as schema from "@/db/schema";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { transitionFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository";
import { readFundingCallById, updateDraftFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import {
  readPublicFundingCallById,
  readPublicFundingCallBySlug,
  readPublicFundingCalls,
} from "@/modules/funding-calls/infrastructure/PublicFundingCallRepository";
import {
  amendmentActorId,
  amendmentPermissionRoles,
  prepareAmendmentDatabase,
  seedAmendmentCall,
} from "../support/FundingCallAmendmentDatabaseFixture";

const enabled = process.env.RUN_FUNDING_CALL_AMENDMENT_DATABASE_TESTS === "true";
const testSchema = `funding_amendment_${randomUUID().replaceAll("-", "")}`;
const provisionPool = enabled ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
const pool = enabled ? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c search_path=${testSchema},public`,
}) : null;
let historicalCallId: string;
let schemaCreated = false;

beforeAll(async () => {
  if (!pool || !provisionPool) return;
  await provisionPool.query(`CREATE SCHEMA ${testSchema}`);
  schemaCreated = true;
  historicalCallId = await prepareAmendmentDatabase(pool);
  vi.mocked(getDatabase).mockReturnValue(drizzle(pool, { schema }));
});

afterAll(async () => {
  await pool?.end();
  try {
    if (schemaCreated) {
      await provisionPool?.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    }
  } finally {
    await provisionPool?.end();
  }
});

function publicationInput(fundingCallId: string, expectedRowVersion: number) {
  return {
    actorId: amendmentActorId,
    correlationId: randomUUID(),
    expectedRowVersion,
    fundingCallId,
    idempotencyKey: randomUUID(),
    now: new Date("2026-10-04T12:00:00Z"),
  };
}

(enabled ? describe : describe.skip)("funding-call amendment repositories in PostgreSQL", () => {
  it("migrates existing authority into separate grants without granting amendment to withdrawal-only roles", async () => {
    const grants = await pool!.query(`SELECT grant_row.role_id, capability.code
      FROM app_role_capabilities grant_row
      JOIN app_capabilities capability ON capability.id = grant_row.capability_id`);
    expect(grants.rows).toContainEqual({
      role_id: amendmentPermissionRoles.creator, code: "funding.call.submit.all",
    });
    expect(grants.rows).toContainEqual({
      role_id: amendmentPermissionRoles.approver, code: "funding.call.return.all",
    });
    expect(grants.rows).toContainEqual({
      role_id: amendmentPermissionRoles.editorAndWithdrawer, code: "funding.call.withdraw-for-amendment.all",
    });
    expect(grants.rows).not.toContainEqual({
      role_id: amendmentPermissionRoles.withdrawalOnly, code: "funding.call.withdraw-for-amendment.all",
    });
  });

  it("backfills the lock for an existing draft application", async () => {
    const call = await readFundingCallById(historicalCallId);
    expect(call?.attachmentsLockedAt?.toISOString()).toBe("2026-09-01T08:00:00.000Z");
  });

  it("locks all attachments on first creation and retains the lock after withdrawal and deletion", async () => {
    const id = await seedAmendmentCall(pool!, "DRAFT");
    const original = await readFundingCallById(id);
    await pool!.query("INSERT INTO app_applications (funding_opportunity_id) VALUES ($1)", [id]);
    await pool!.query("UPDATE app_applications SET status = 'withdrawn' WHERE funding_opportunity_id = $1", [id]);
    await pool!.query("DELETE FROM app_applications WHERE funding_opportunity_id = $1", [id]);
    expect((await readFundingCallById(id))?.attachmentsLockedAt).toBeInstanceOf(Date);
    for (const column of ["form_version_id", "eligibility_rule_set_version_id", "workflow_template_version_id"]) {
      await expect(pool!.query(`UPDATE app_funding_calls SET ${column} = NULL WHERE id = $1`, [id]))
        .rejects.toThrow("configuration attachments are locked");
    }
    await expect(pool!.query("UPDATE app_funding_calls SET attachments_locked_at = NULL WHERE id = $1", [id]))
      .rejects.toThrow("configuration attachments are locked");
    const input = fundingCallUpdateSchema.parse({
      ...original,
      title: "Metadata amendment",
      opensAt: original!.opensAt.toISOString(),
      closesAt: original!.closesAt.toISOString(),
      expectedRowVersion: original!.rowVersion + 1,
    });
    await expect(updateDraftFundingCall(amendmentActorId, id, input))
      .resolves.toMatchObject({ title: "Metadata amendment" });
  });

  it("allows attachment changes before any application has existed", async () => {
    const id = await seedAmendmentCall(pool!, "DRAFT");
    await pool!.query("UPDATE app_funding_calls SET workflow_template_version_id = NULL WHERE id = $1", [id]);
    expect((await readFundingCallById(id))?.workflowTemplateVersionId).toBeNull();
  });

  it("keeps SQL ordering and cursor boundaries consistent when a call has multiple revisions", async () => {
    const ids = [await seedAmendmentCall(pool!), await seedAmendmentCall(pool!)];
    for (const id of ids) {
      await pool!.query("UPDATE app_funding_calls SET title = 'Pagination scenario' WHERE id = $1", [id]);
      await publishApprovedFundingCall(publicationInput(id, 2));
    }
    await pool!.query(`UPDATE app_funding_calls
      SET status = 'APPROVED', row_version = row_version + 2 WHERE id = $1`, [ids[0]]);
    await publishApprovedFundingCall(publicationInput(ids[0], 5));
    const first = await readPublicFundingCalls({
      limit: 1, now: new Date("2026-10-04"), search: "Pagination", status: "open",
    });
    expect(first.total).toBe(2);
    expect(first.items.map((call) => call.id)).toEqual([...ids].sort().reverse());
    const second = await readPublicFundingCalls({
      after: { id: first.items[0].id, opensAt: first.items[0].opensAt },
      limit: 1, now: new Date("2026-10-04"), search: "Pagination", status: "open",
    });
    expect(second.items.map((call) => call.id)).toEqual([first.items[1].id]);
  });

  it("republishes revisions without overwriting history and exposes only the latest snapshot", async () => {
    const id = await seedAmendmentCall(pool!);
    const firstInput = publicationInput(id, 2);
    expect((await publishApprovedFundingCall(firstInput)).kind).toBe("published");
    await pool!.query("INSERT INTO app_applications (funding_opportunity_id, status) VALUES ($1, 'submitted')", [id]);
    const locked = await readFundingCallById(id);
    const amendmentInput = {
      ...publicationInput(id, locked!.rowVersion),
      command: "WITHDRAW_FOR_AMENDMENT" as const,
      reason: "Clarify public guidance",
    };
    expect((await transitionFundingCall(amendmentInput)).kind).toBe("transitioned");
    expect((await transitionFundingCall(amendmentInput)).kind).toBe("replayed");
    await expect(readPublicFundingCallById(id)).resolves.toBeNull();
    expect((await pool!.query("SELECT status FROM app_applications WHERE funding_opportunity_id = $1", [id])).rows)
      .toEqual([{ status: "submitted" }]);
    const draft = (await readFundingCallById(id))!;
    expect(draft.updatedBy).toBe(amendmentActorId);
    expect((await publishApprovedFundingCall(publicationInput(id, draft.rowVersion))).kind).toBe("conflict");
    // Service tests verify fresh submission and maker-checker approval. Here exercise repository republication.
    await pool!.query(`UPDATE app_funding_calls
      SET title = 'Amended title', description = '<p>Amended guidance</p>', status = 'APPROVED', row_version = row_version + 2
      WHERE id = $1`, [id]);
    const approved = (await readFundingCallById(id))!;
    const secondInput = publicationInput(id, approved.rowVersion);
    expect((await publishApprovedFundingCall(secondInput)).kind).toBe("published");
    expect((await publishApprovedFundingCall(secondInput)).kind).toBe("replayed");
    const revisions = await pool!.query(`SELECT revision_number, snapshot->>'title' AS title
      FROM app_funding_call_publication_revisions WHERE funding_call_id = $1 ORDER BY revision_number`, [id]);
    expect(revisions.rows).toEqual([
      { revision_number: 1, title: "Original title" },
      { revision_number: 2, title: "Amended title" },
    ]);
    await expect(readPublicFundingCallById(id)).resolves.toMatchObject({ title: "Amended title" });
    await expect(readPublicFundingCallBySlug(approved.slug)).resolves.toMatchObject({ title: "Amended title" });
    const page = await readPublicFundingCalls({ limit: 10, now: secondInput.now, search: "Amended", status: "open" });
    expect(page.total).toBe(1);
    expect(page.items.map((call) => call.title)).toEqual(["Amended title"]);
    await expect(pool!.query("UPDATE app_funding_call_publication_revisions SET revision_number = 3 WHERE funding_call_id = $1", [id]))
      .rejects.toThrow("publication revisions are immutable");
  });
});
