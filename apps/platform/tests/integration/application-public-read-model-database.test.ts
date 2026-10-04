import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  findOwnedApplicationStatus,
  listOwnedApplications,
} from "@/modules/applications/infrastructure/ApplicationRepository";
import { readOwnedApplicationStatusHistory } from "@/modules/applications/infrastructure/ApplicationStatusHistoryRepository";
import {
  businessOpportunityId,
  draftOpportunityId,
  eligibilityRuleSetVersionId,
  firstOwnerId,
  formVersionId,
  secondOwnerId,
  seedApplicationDatabaseFixture,
} from "../support/application-database-fixture";

const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const ids: string[] = [];

async function createTestApplication(
  ownerUserId: string,
  fundingOpportunityId: string,
) {
  const result = await pool!.query<{ id: string }>(
    `INSERT INTO app_applications (
       owner_user_id, funding_opportunity_id, funding_opportunity_title,
       eligibility_rule_set_version_id, form_version_id, duplicate_policy
     ) VALUES ($1, $2, 'Read model fund', $3, $4, 'one_per_business')
     RETURNING id`,
    [ownerUserId, fundingOpportunityId, eligibilityRuleSetVersionId, formVersionId],
  );
  return result.rows[0]!.id;
}

beforeAll(async () => {
  if (!pool) return;
  await seedApplicationDatabaseFixture((text, values) => pool.query(text, values));
  for (const [ownerUserId, fundingOpportunityId] of [
    [firstOwnerId, businessOpportunityId],
    [firstOwnerId, draftOpportunityId],
    [secondOwnerId, draftOpportunityId],
  ]) {
    ids.push(await createTestApplication(ownerUserId, fundingOpportunityId));
  }
  await pool.query(
    `UPDATE app_applications SET updated_at = CASE id
       WHEN $1::uuid THEN '2026-09-01T00:00:00Z'::timestamptz
       WHEN $2::uuid THEN '2026-09-02T00:00:00Z'::timestamptz
       ELSE updated_at END
     WHERE id IN ($1::uuid, $2::uuid)`,
    ids.slice(0, 2),
  );
});

afterAll(async () => pool?.end());

describeDatabase("applicant public read models", () => {
  it("selects only safe fields and scopes detail to the owner", async () => {
    const owned = await findOwnedApplicationStatus(firstOwnerId, ids[0]!);
    expect(owned).toMatchObject({
      activeStageStatuses: [],
      canWithdraw: false,
      id: ids[0],
      status: "draft",
    });
    expect(owned).not.toHaveProperty("financialSection");
    expect(owned).not.toHaveProperty("businessSection");
    await expect(findOwnedApplicationStatus(secondOwnerId, ids[0]!))
      .resolves.toBeNull();
    await expect(readOwnedApplicationStatusHistory({
      applicationId: ids[0]!,
      limit: 10,
      ownerUserId: secondOwnerId,
    })).resolves.toEqual([]);
  });

  it("orders, filters, and paginates in PostgreSQL without owner leakage", async () => {
    const first = await listOwnedApplications({
      limit: 1,
      ownerUserId: firstOwnerId,
      status: "draft",
    });
    expect(first.total).toBe(2);
    expect(first.items.map((item) => item.id)).toEqual([ids[1]]);
    const second = await listOwnedApplications({
      after: { id: first.items[0]!.id, updatedAt: first.items[0]!.updatedAt },
      limit: 1,
      ownerUserId: firstOwnerId,
      status: "draft",
    });
    expect(second.items.map((item) => item.id)).toEqual([ids[0]]);
    expect(second.items).not.toContainEqual(expect.objectContaining({ id: ids[2] }));
  });
});
