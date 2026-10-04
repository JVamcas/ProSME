import pg from "pg";

const confirmation = "--confirm-reset";
if (
  !process.argv.includes(confirmation)
  && process.env.CONFIRM_PLATFORM_DATA_RESET !== "yes"
) {
  throw new Error(`Refusing to reset data without ${confirmation}.`);
}
if (process.env.ENVIRONMENT !== "local") {
  throw new Error("The platform data reset is restricted to ENVIRONMENT=local.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const preservedTables = [
  "app_capabilities",
  "app_funding_call_governance_policy",
  "app_role_capabilities",
  "app_roles",
  "app_user_identities",
  "app_user_roles",
  "app_users",
] as const;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(724613928)");
  const preservedBefore = new Map<string, string>();
  for (const table of preservedTables) {
    const result = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}`,
    );
    preservedBefore.set(table, result.rows[0]!.count);
  }
  const targetResult = await client.query<{ tablename: string }>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename <> 'app_funding_call_governance_policy'
       AND (
         tablename IN (
           'app_applicant_profiles',
           'app_business_profiles',
           'app_profile_audit_entries',
           'app_applications',
           'app_authoritative_eligibility_outcomes',
           'app_condition_groups',
           'app_funding_calls',
           'app_funding_opportunity_workflows',
           'app_transactional_outbox'
         )
         OR tablename LIKE 'app_application\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_eligibility\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_form\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_funding_call\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_stage_task\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_task\\_%' ESCAPE '\\'
         OR tablename LIKE 'app_workflow\\_%' ESCAPE '\\'
       )
     ORDER BY tablename`,
  );
  if (!targetResult.rows.length) {
    throw new Error("No resettable platform tables were found.");
  }
  const targets = targetResult.rows.map((row) => quoteIdentifier(row.tablename));
  await client.query(`TRUNCATE TABLE ${targets.join(", ")} RESTART IDENTITY`);

  for (const [table, count] of preservedBefore) {
    const after = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM ${quoteIdentifier(table)}`,
    );
    if (after.rows[0]?.count !== count) {
      throw new Error(`Reset changed preserved table ${table}.`);
    }
  }
  await client.query("COMMIT");
  console.log(
    `Reset ${targets.length} application, profile, funding-call, form, eligibility and workflow tables.`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
