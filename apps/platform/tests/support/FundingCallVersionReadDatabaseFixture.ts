import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getTableConfig } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, vi } from "vitest";
import { getDatabase } from "@/db/client";
import { getDatabase as platformDatabase } from "@/platform/database/client";
import {
  fundingCalls,
  fundingCallPublicationRevisions,
} from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { fundingCallDraftVersions } from "@/modules/funding-calls/infrastructure/funding-call-version.schema";
import { applicationCommands } from "@/modules/applications/infrastructure/application.schema";

export function installFundingCallVersionReadDatabaseFixture() {
  const url = process.env.FUNDING_VERSION_READ_TEST_DATABASE_URL;
  const schema = `version_reads_${randomUUID().replaceAll("-", "")}`;
  const callId = randomUUID();
  const otherId = randomUUID();
  const pagedId = randomUUID();
  const publicationIds = Array.from({ length: 4 }, () => randomUUID());
  const draftId = randomUUID();
  let pool: pg.Pool;
  const statements: string[] = [];
  const snapshot = (title: string) => ({
    title,
    description: "<p>Public description</p>",
    opensAt: "2026-10-01T00:00:00Z",
    closesAt: "2026-11-01T00:00:00Z",
    formVersionId: null,
    eligibilityRuleSetVersionId: null,
    workflowTemplateVersionId: null,
  });

  beforeAll(async () => {
    pool = new pg.Pool({
      connectionString: url,
      options: `-c search_path=${schema}`,
    });
    await pool.query(`CREATE SCHEMA ${schema}`);
    // Use actual column definitions; omit unrelated write constraints in this
    // disposable projection fixture. No application/public tables are changed.
    for (const table of [
      fundingCalls,
      fundingCallPublicationRevisions,
      fundingCallDraftVersions,
      applicationCommands,
    ]) {
      const config = getTableConfig(table);
      const columns = config.columns
        .map((column) => `"${column.name}" ${column.getSQLType()}`)
        .join(", ");
      await pool.query(`CREATE TABLE "${config.name}" (${columns})`);
    }
    await pool.query(`
      CREATE TABLE app_authorization_audit_entries(id uuid DEFAULT gen_random_uuid(), actor_id text NOT NULL, target_user_id uuid, target_role_id uuid, action text NOT NULL, role_code text, changes jsonb NOT NULL, created_at timestamptz DEFAULT now());
      CREATE TABLE app_form_versions(id uuid, form_definition_id uuid);
      CREATE TABLE app_eligibility_rule_set_versions(id uuid, rule_set_id uuid);
      CREATE TABLE app_workflow_definition_versions(id uuid, definition_id uuid);
    `);
    for (const id of [callId, otherId, pagedId]) {
      await pool.query(
        `INSERT INTO app_funding_calls
        (id, title, description, opens_at, closes_at, status, row_version, created_at, updated_at, public_interaction_enabled)
        VALUES ($1, 'Initial call', '<p>Public description</p>', now(), now() + interval '1 month', 'DRAFT', 1, now(), now(), true)`,
        [id],
      );
    }
    for (let index = 0; index < publicationIds.length; index++) {
      await pool.query(
        `INSERT INTO app_funding_call_publication_revisions
        (id, funding_call_id, revision_number, snapshot, published_status, published_at)
        VALUES ($1, $2, $3, $4, 'LIVE', now())`,
        [
          publicationIds[index],
          callId,
          index + 1,
          snapshot(`Version ${index + 1}`),
        ],
      );
    }
    await pool.query(
      "UPDATE app_funding_calls SET current_published_version_id = $1, status = 'LIVE' WHERE id = $2",
      [publicationIds[3], callId],
    );
    await pool.query(
      `INSERT INTO app_funding_call_draft_versions
      (id, funding_call_id, source_version_id, status, snapshot, updated_at)
      VALUES ($1, $2, $3, 'DRAFT', $4, now())`,
      [
        draftId,
        callId,
        publicationIds[1],
        snapshot("Replacement from version 2"),
      ],
    );
    for (let number = 1; number <= 12; number++) {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO app_funding_call_publication_revisions
        (id, funding_call_id, revision_number, snapshot, published_status, published_at)
        VALUES ($1, $2, $3, $4, 'LIVE', now())`,
        [id, pagedId, number, snapshot(`Paged ${number}`)],
      );
      if (number === 12) {
        await pool.query(
          "UPDATE app_funding_calls SET current_published_version_id = $1, status = 'CLOSED' WHERE id = $2",
          [id, pagedId],
        );
      }
    }
    vi.mocked(getDatabase).mockReturnValue(
      drizzle(pool, {
        logger: { logQuery: (query) => statements.push(query) },
      }) as ReturnType<typeof getDatabase>,
    );
    vi.mocked(platformDatabase).mockReturnValue(getDatabase());
  });

  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA ${schema} CASCADE`);
      await pool.end();
    }
  });

  return {
    callId,
    otherId,
    pagedId,
    publicationIds,
    draftId,
    statements,
    get pool() {
      return pool;
    },
  };
}
