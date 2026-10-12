import { sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readStageCompletionTargets } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { readWorkflowActionAvailabilitySource } from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";

type AmountProjection = { maximumAmount: SQL; minimumAmount: SQL };

const connectionString = process.env.WORKFLOW_FUNDING_TEST_DATABASE_URL;
const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3_000 });
const dialect = new PgDialect();
let connected = false;

// Capture the actual repository projection without requiring unrelated workflow
// fixtures. PostgreSQL evaluates those expressions against real numeric columns.
async function captureAmounts(read: () => Promise<unknown>) {
  let amounts: AmountProjection | undefined;
  const query = {
    from: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    where: () => query,
    limit: async () => [],
    then: (resolve: (rows: never[]) => unknown) => Promise.resolve([]).then(resolve),
  };
  vi.mocked(getDatabase).mockReturnValue({
    select: (selection: { fundingCall: AmountProjection }) => {
      amounts = selection.fundingCall;
      return query;
    },
  } as never);
  await read();
  expect(amounts).toBeDefined();
  return amounts!;
}

const readers = [
  {
    name: "stage completion",
    read: () => readStageCompletionTargets([crypto.randomUUID()]),
  },
  {
    name: "action availability",
    read: () => readWorkflowActionAvailabilitySource({
      actorId: crypto.randomUUID(),
      sourceStageInstanceId: crypto.randomUUID(),
      workflowInstanceId: crypto.randomUUID(),
    }),
  },
];

describe.skipIf(!connectionString)("workflow funding amounts on PostgreSQL", () => {
  beforeAll(async () => {
    await client.connect();
    connected = true;
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE app_funding_calls (
        minimum_grant_amount numeric(18, 2), maximum_grant_amount numeric(18, 2)
      );
      CREATE TEMP TABLE app_funding_call_publication_revisions (snapshot jsonb);
      INSERT INTO app_funding_calls VALUES (1234.56, 98765.43);
      INSERT INTO app_funding_call_publication_revisions VALUES (NULL);
    `);
  });

  afterAll(async () => {
    if (connected) await client.query("ROLLBACK");
    await client.end();
  });

  for (const { name, read } of readers) {
    it.each([
      ["no publication", null, 1234.56, 98765.43],
      ["missing amounts", {}, 1234.56, 98765.43],
      [
        "null amounts",
        { minimumGrantAmount: null, maximumGrantAmount: null },
        1234.56,
        98765.43,
      ],
      [
        "published strings",
        { minimumGrantAmount: "2000.12", maximumGrantAmount: "50000.34" },
        2000.12,
        50000.34,
      ],
      [
        "published numbers",
        { minimumGrantAmount: 0, maximumGrantAmount: 70000.89 },
        0,
        70000.89,
      ],
    ])(`${name}: %s`, async (_label, snapshot, minimumAmount, maximumAmount) => {
      await client.query(
        "UPDATE app_funding_call_publication_revisions SET snapshot = $1::jsonb",
        [snapshot === null ? null : JSON.stringify(snapshot)],
      );
      const amounts = await captureAmounts(read);
      const statement = dialect.sqlToQuery(sql`
        SELECT ${amounts.minimumAmount} AS "minimumAmount",
          ${amounts.maximumAmount} AS "maximumAmount"
        FROM app_funding_calls
        CROSS JOIN app_funding_call_publication_revisions
      `);
      const result = await client.query(statement.sql, statement.params);
      expect(result.rows).toHaveLength(1);
      expect(Number(result.rows[0].minimumAmount)).toBe(minimumAmount);
      expect(Number(result.rows[0].maximumAmount)).toBe(maximumAmount);
      expect(typeof result.rows[0].minimumAmount).toBe("string");
      expect(typeof result.rows[0].maximumAmount).toBe("string");
    });
  }
});
