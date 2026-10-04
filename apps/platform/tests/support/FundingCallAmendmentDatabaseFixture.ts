import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type pg from "pg";

export const amendmentActorId = "10000000-0000-4000-8000-000000000001";
export const amendmentPermissionRoles = {
  creator: "10000000-0000-4000-8000-000000000002",
  approver: "10000000-0000-4000-8000-000000000003",
  withdrawalOnly: "10000000-0000-4000-8000-000000000004",
  editorAndWithdrawer: "10000000-0000-4000-8000-000000000005",
};

export async function prepareAmendmentDatabase(pool: pg.Pool) {
  // Copy structure only. All writes use the test pool's isolated search_path.
  for (const table of [
    "app_funding_calls",
    "app_funding_call_lifecycle_history",
    "app_funding_call_publication_revisions",
    "app_funding_call_public_documents",
    "app_transactional_outbox",
  ]) {
    await pool.query(`CREATE TABLE ${table} (
      LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES
    )`);
  }
  await pool.query(`
    ALTER TABLE app_funding_calls DROP COLUMN IF EXISTS attachments_locked_at;
    ALTER TABLE app_funding_calls
      ADD COLUMN IF NOT EXISTS allow_resubmission_after_withdrawal boolean NOT NULL DEFAULT false;
    CREATE TABLE app_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      funding_opportunity_id uuid NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE app_capabilities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE NOT NULL,
      description text NOT NULL
    );
    CREATE TABLE app_role_capabilities (
      role_id uuid NOT NULL,
      capability_id uuid NOT NULL,
      PRIMARY KEY (role_id, capability_id)
    );
  `);
  await pool.query(`INSERT INTO app_capabilities (code, description) VALUES
    ('funding.call.create', 'Create'), ('funding.call.edit-draft', 'Edit'),
    ('funding.call.approve.all', 'Approve'), ('funding.call.withdraw', 'Withdraw')`);
  for (const [role, code] of [
    [amendmentPermissionRoles.creator, "funding.call.create"],
    [amendmentPermissionRoles.approver, "funding.call.approve.all"],
    [amendmentPermissionRoles.withdrawalOnly, "funding.call.withdraw"],
    [amendmentPermissionRoles.editorAndWithdrawer, "funding.call.withdraw"],
    [amendmentPermissionRoles.editorAndWithdrawer, "funding.call.edit-draft"],
  ]) {
    await pool.query(`INSERT INTO app_role_capabilities (role_id, capability_id)
      SELECT $1, id FROM app_capabilities WHERE code = $2`, [role, code]);
  }
  const historicalCallId = await seedAmendmentCall(pool);
  await pool.query(`INSERT INTO app_applications (funding_opportunity_id, created_at)
    VALUES ($1, '2026-09-01T08:00:00Z')`, [historicalCallId]);
  const migration = readFileSync(path.resolve(
    process.cwd(), "drizzle/0161_funding_call_amendments.sql",
  ), "utf8");
  await pool.query(migration);
  const publicationMigration = readFileSync(path.resolve(
    process.cwd(), "drizzle/0070_funding_call_publication.sql",
  ), "utf8");
  await pool.query(publicationMigration.slice(
    publicationMigration.indexOf("CREATE OR REPLACE FUNCTION protect_funding_call_publication_revision"),
  ));
  return historicalCallId;
}

export async function seedAmendmentCall(pool: pg.Pool, status = "APPROVED") {
  const id = randomUUID();
  await pool.query(`INSERT INTO app_funding_calls (
    id, reference, slug, title, description,
    total_budget_envelope, minimum_grant_amount, maximum_grant_amount,
    opens_at, closes_at, status, created_by, updated_by, row_version,
    form_version_id, eligibility_rule_set_version_id, workflow_template_version_id
  ) VALUES ($1, $2, $3, 'Original title', '<p>Original description</p>',
    1000000, 1000, 100000, '2026-01-01', '2030-01-01', $4, $5, $5, 2,
    $6, $7, $8)`, [
    id, `TEST-${id.toUpperCase()}`, `test-${id}`, status, amendmentActorId,
    randomUUID(), randomUUID(), randomUUID(),
  ]);
  return id;
}
