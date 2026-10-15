import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

import { getDatabase } from "@/db/client";
import * as schema from "@/db/schema";
import {
  fundingCalls,
  fundingCallLifecycleHistory,
  fundingCallPublicationRevisions,
} from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { fundingCallDraftVersions } from "@/modules/funding-calls/infrastructure/funding-call-version.schema";
import { fundingCallPublicDocuments } from "@/modules/funding-calls/infrastructure/funding-call-public-document.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import {
  formDefinitions,
  formVersions,
  formFields,
  formSections,
  formFieldOptions,
} from "@/modules/forms/infrastructure/form.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import { workflowAuditEntries } from "@/modules/workflows/infrastructure/workflow-audit.schema";

export const enabled =
  process.env.RUN_CASCADE_PUBLICATION_DATABASE_TESTS === "true";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
export const actorId = randomUUID();
export const workflowId = randomUUID();
export const queries: string[] = [];
export let client: PoolClient;
export let database: ReturnType<typeof getDatabase>;
const tables = [
  fundingCalls,
  fundingCallLifecycleHistory,
  fundingCallPublicationRevisions,
  fundingCallDraftVersions,
  fundingCallPublicDocuments,
  eligibilityRuleSetVersions,
  formDefinitions,
  formVersions,
  formFields,
  formSections,
  formFieldOptions,
  workflowDefinitionVersions,
  workflowAuditEntries,
];

function createTable(table: PgTable) {
  const columns = Object.values(getTableColumns(table)).map((column) => {
    const primary =
      column.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : "";
    return `"${column.name}" ${column.getSQLType()}${primary}`;
  });
  return `CREATE TEMP TABLE ${getTableName(table)} (${columns.join(", ")})`;
}

export async function seedForm(status = "DRAFT", valid = true) {
  const definitionId = randomUUID();
  const versionId = randomUUID();
  const sectionId = randomUUID();
  await client.query(
    "INSERT INTO app_form_definitions (id, code, name, description, active) VALUES ($1::uuid,$1::text,'Original','',true)",
    [definitionId],
  );
  await client.query(
    `INSERT INTO app_form_versions
    (id, form_definition_id, version_number, status, row_version, metadata, submit_label)
    VALUES ($1,$2,1,$3,1,'{"name":"Published name"}','Submit')`,
    [versionId, definitionId, status],
  );
  await client.query(
    `INSERT INTO app_form_sections
    (id, form_version_id, key, title, display_order, column_span, show_container, description)
    VALUES ($1,$2,'DETAILS','Details',1,3,true,'')`,
    [sectionId, versionId],
  );
  if (valid) {
    await client.query(
      `INSERT INTO app_form_fields
      (form_version_id, section_id, key, label, type, display_order, column_span, required)
      VALUES ($1,$2,'NAME','Name','TEXT',1,1,false)`,
      [versionId, sectionId],
    );
  }
  return versionId;
}

export async function statuses() {
  return (
    await client.query(
      "SELECT status, row_version FROM app_form_versions ORDER BY status",
    )
  ).rows;
}

beforeAll(async () => {
  if (!enabled) return;
  client = await pool.connect();
  await client.query("SET search_path = pg_temp");
  for (const table of tables) await client.query(createTable(table));
  await client.query(
    "ALTER TABLE app_workflow_audit_entries ADD UNIQUE (idempotency_key)",
  );
  await client.query(
    "ALTER TABLE app_funding_call_lifecycle_history ADD UNIQUE (idempotency_key)",
  );
  database = drizzle(client, {
    schema,
    logger: { logQuery: (query) => queries.push(query) },
  });
  vi.mocked(getDatabase).mockReturnValue(
    database as ReturnType<typeof getDatabase>,
  );
});
beforeEach(async () => {
  if (!enabled) return;
  await client.query(`TRUNCATE ${tables.map(getTableName).join(", ")}`);
  await client.query(
    `INSERT INTO app_workflow_definition_versions (id, status, row_version)
    VALUES ($1,'DRAFT',1)`,
    [workflowId],
  );
  queries.length = 0;
  vi.clearAllMocks();
});
afterAll(async () => {
  client?.release();
  await pool.end();
});
