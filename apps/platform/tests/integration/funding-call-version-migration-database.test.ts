import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallNotificationRepository",
  () => ({ captureFundingCallNotification: vi.fn() }),
);
import {
  beforeVersionMigration,
  enabled,
  pool,
} from "../support/FundingCallVersionDatabaseHarness";
import {
  legacyCallId,
  legacyApplicationId,
  legacySubmittedId,
  legacyUnmatchedId,
  legacyPublicationId,
  seedLegacyCallAmendment,
} from "../support/LegacyFundingCallVersionFixture";
import {
  readFundingCallById,
  readEffectiveFundingCallById,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";

import { versionActorId } from "../support/FundingCallVersionDatabaseFixture";

const integrationId = randomUUID();
const integrationVersionId = randomUUID();
const legacyBindingId = randomUUID();

beforeVersionMigration(async (database) => {
  await seedLegacyCallAmendment(database);
  await database.query(
    `INSERT INTO app_eligibility_integration_definitions
      (id, stable_key, name, created_by) VALUES ($1::uuid,$1::text,'Legacy provider',$2)`,
    [integrationId, versionActorId],
  );
  await database.query(
    `INSERT INTO app_eligibility_integration_versions
      (id, definition_id, version_number, status, output_schema, retry_policy, raw_response_policy, created_by)
      VALUES ($1,$2,1,'PUBLISHED','[{"key":"registered","type":"BOOLEAN"}]','{}','{}',$3)`,
    [integrationVersionId, integrationId, versionActorId],
  );
  await database.query(
    `INSERT INTO app_funding_call_eligibility_integration_bindings
      (id, funding_call_id, workflow_template_version_id, integration_version_id,
        provider_adapter_key, provider_display_name, created_by)
      SELECT $1, id, workflow_template_version_id, $2, 'legacy_provider','Legacy provider',$3
      FROM app_funding_calls WHERE id=$4`,
    [legacyBindingId, integrationVersionId, versionActorId, legacyCallId],
  );
});

(enabled ? describe : describe.skip)(
  "legacy funding call version migration",
  () => {
    it("restores the published call and preserves the proposed amendment as a fresh draft", async () => {
      const effective = await readEffectiveFundingCallById(legacyCallId);
      const draft = await readFundingCallById(legacyCallId);
      expect(effective).toMatchObject({
        status: "LIVE",
        title: "Original version",
        currentPublishedVersionId: legacyPublicationId,
      });
      expect(effective?.opensAt.getUTCFullYear()).toBe(2000);
      expect(draft).toMatchObject({
        status: "DRAFT",
        title: "Unpublished legacy amendment",
        effectiveStatus: "LIVE",
      });
      expect(draft?.opensAt.getUTCFullYear()).toBe(2050);
      expect(draft?.draftVersionId).toBeTruthy();
      const review = await pool!.query(
        "SELECT outcome, reason FROM app_funding_call_governance_reviews WHERE funding_call_id = $1",
        [legacyCallId],
      );
      expect(review.rows[0]).toEqual({ outcome: "WITHDRAWN", reason: null });
    });

    it("preserves legacy integration identity and copies bindings into the pending replacement", async () => {
      const draft = (await readFundingCallById(legacyCallId))!;
      const query = `SELECT link.funding_call_version_id, binding.id, binding.provider_display_name
        FROM app_funding_call_version_integration_bindings link
        JOIN app_funding_call_eligibility_integration_bindings binding ON binding.id=link.binding_id
        WHERE link.funding_call_id=$1 ORDER BY link.funding_call_version_id`;
      const before = await pool!.query(query, [legacyCallId]);
      expect(before.rows).toHaveLength(2);
      expect(before.rows).toContainEqual({
        funding_call_version_id: legacyPublicationId,
        id: legacyBindingId,
        provider_display_name: "Legacy provider",
      });
      const replacement = before.rows.find(
        (row) => row.funding_call_version_id === draft.draftVersionId,
      );
      expect(replacement?.id).toBeTruthy();
      expect(replacement?.id).not.toBe(legacyBindingId);
      expect(replacement?.provider_display_name).toBe("Legacy provider");
      for (const name of [
        "0185_asset_version_metadata",
        "0186_funding_call_integration_versions",
      ]) {
        await pool!.query(
          readFileSync(
            path.resolve(process.cwd(), `drizzle/${name}.sql`),
            "utf8",
          ),
        );
      }
      expect((await pool!.query(query, [legacyCallId])).rows).toEqual(
        before.rows,
      );
      await expect(
        pool!.query(
          "UPDATE app_funding_call_eligibility_integration_bindings SET provider_display_name='Changed' WHERE id=$1",
          [legacyBindingId],
        ),
      ).rejects.toThrow(/bindings are immutable/);
    });

    it("pins historical drafts and submitted applications to their original publication", async () => {
      const applications = await pool!.query(
        "SELECT id, funding_call_version_id, row_version, status FROM app_applications WHERE funding_opportunity_id = $1 ORDER BY id",
        [legacyCallId],
      );
      expect(applications.rows).toEqual(
        expect.arrayContaining([
          {
            id: legacyApplicationId,
            funding_call_version_id: legacyPublicationId,
            row_version: 2,
            status: "draft",
          },
          {
            id: legacySubmittedId,
            funding_call_version_id: legacyPublicationId,
            row_version: 2,
            status: "submitted",
          },
          {
            id: legacyUnmatchedId,
            funding_call_version_id: null,
            row_version: 1,
            status: "draft",
          },
        ]),
      );
      const history = await pool!.query(
        "SELECT snapshot->>'title' AS title FROM app_funding_call_publication_revisions WHERE id = $1",
        [legacyPublicationId],
      );
      expect(history.rows[0].title).toBe("Original version");
    });
  },
);
