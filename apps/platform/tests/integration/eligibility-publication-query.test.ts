import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { findEligibilityInputPublicationIssues } from "@/modules/eligibility/infrastructure/EligibilityInputRepository";

const enabled = process.env.RUN_P5_ELIGIBILITY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const userId = randomUUID();
const ruleSetId = randomUUID();
const versionId = randomUUID();
const groupId = randomUUID();
const conditionId = randomUUID();

beforeAll(async () => {
  if (!pool) return;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Publication query test', 'staff', 'active')`,
    [userId, `publication-query-${userId}@example.test`],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rule_sets
       (id, code, name, description, created_by)
     VALUES ($1, $2, 'Publication query test', '', $3)`,
    [ruleSetId, `PUBLICATION_QUERY_${ruleSetId.replaceAll("-", "")}`, userId],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rule_set_versions
       (id, rule_set_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [versionId, ruleSetId, userId],
  );
  await pool.query(
    `INSERT INTO app_condition_groups (id, definition)
     VALUES ($1, $2)`,
    [groupId, {
      children: [{
        id: conditionId,
        kind: "CONDITION",
        leftOperand: {
          key: "application.employee_count",
          kind: "FIELD",
        },
        operator: "GREATER_THAN",
        rightOperand: { kind: "CONSTANT", value: 0 },
      }],
      combinator: "AND",
      id: groupId,
      kind: "GROUP",
    }],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rules
       (version_id, condition_group_id, condition_kind, condition_id,
        failure_type, reason_code, applicant_message, execution_mode,
        display_order)
     VALUES ($1, $2, 'CONDITION', $3, 'HARD_FAIL', 'EMPLOYEE_REQUIRED',
       'At least one employee is required.', 'SELF_CHECK', 1)`,
    [versionId, groupId, conditionId],
  );
});

afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & {
    smeFundPool?: pg.Pool;
  };
  await databaseGlobal.smeFundPool?.end();
});

(enabled ? describe : describe.skip)("eligibility publication query", () => {
  it("reports an unresolved field reference without a PostgreSQL type error", async () => {
    await expect(findEligibilityInputPublicationIssues(versionId)).resolves.toEqual([
      'EMPLOYEE_REQUIRED: unresolved field reference "application.employee_count".',
    ]);
  });
});
