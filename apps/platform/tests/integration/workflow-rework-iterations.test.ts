import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import pg from "pg";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { workflowReworkContinuationContext } from "@/modules/workflows/infrastructure/WorkflowReworkContinuationProjection";
import { loadStageReworkIteration } from "@/modules/workflows/infrastructure/StageActivationRepository";

const enabled =
  process.env.RUN_WORKFLOW_REWORK_ITERATION_DATABASE_TESTS === "true";
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3_000,
});
const workflowId = randomUUID();
const stageDefinitionId = randomUUID();
const dialect = new PgDialect();
let connected = false;

beforeAll(async () => {
  if (!enabled) return;
  await client.connect();
  connected = true;
  await client.query("BEGIN");
  await client.query(`CREATE TEMP TABLE app_workflow_stage_instances (
    id uuid, workflow_instance_id uuid, workflow_stage_definition_id uuid,
    iteration_number integer, status text, return_context jsonb
  )`);
});

afterAll(async () => {
  if (!connected) return;
  await client.query("ROLLBACK");
  await client.end();
});

describe.skipIf(!enabled)("onward rework iteration selection", () => {
  it.each([
    [null, 1, false],
    ["COMPLETED", 2, false],
    ["CANCELLED", 2, false],
    ["ACTIVE", 2, true],
    ["BLOCKED", 2, true],
  ] as const)(
    "selects a fresh iteration or existing %s work",
    async (status, nextIterationNumber, reuse) => {
      await client.query("TRUNCATE app_workflow_stage_instances");
      const instanceId = randomUUID();
      if (status) {
        await client.query(
          "INSERT INTO app_workflow_stage_instances VALUES ($1, $2, $3, 1, $4, null)",
          [instanceId, workflowId, stageDefinitionId, status],
        );
      }
      const result = await loadStageReworkIteration(
        {
          execute: async (
            statement: Parameters<typeof dialect.sqlToQuery>[0],
          ) => {
            const query = dialect.sqlToQuery(statement);
            return client.query(query.sql, query.params);
          },
        } as never,
        workflowId,
        stageDefinitionId,
      );
      expect(result).toEqual({
        nextIterationNumber,
        activeStageInstanceId: reuse ? instanceId : null,
      });
    },
  );

  it("excludes other workflows and stage definitions when choosing the next iteration", async () => {
    await client.query("TRUNCATE app_workflow_stage_instances");
    await client.query(
      `INSERT INTO app_workflow_stage_instances VALUES
      ($1, $2, $3, 2, 'COMPLETED', null),
      ($4, $5, $3, 99, 'ACTIVE', null),
      ($6, $2, $7, 99, 'ACTIVE', null)`,
      [
        randomUUID(),
        workflowId,
        stageDefinitionId,
        randomUUID(),
        randomUUID(),
        randomUUID(),
        randomUUID(),
      ],
    );
    const result = await loadStageReworkIteration(
      {
        execute: async (
          statement: Parameters<typeof dialect.sqlToQuery>[0],
        ) => {
          const query = dialect.sqlToQuery(statement);
          return client.query(query.sql, query.params);
        },
      } as never,
      workflowId,
      stageDefinitionId,
    );
    expect(result).toEqual({
      nextIterationNumber: 3,
      activeStageInstanceId: null,
    });
  });
});

describe.skipIf(!enabled)("return continuation context projection", () => {
  it.each(["continue", "finished", "nested", "foreign", "empty", "cycle"])(
    "resolves %s context within this workflow",
    async (scenario) => {
      await client.query("TRUNCATE app_workflow_stage_instances");
      const originId = randomUUID();
      const nestedId = randomUUID();
      const otherStageId = randomUUID();
      const context = {
        sourceStageInstanceId: originId,
        dataHandling: "RETAIN",
      };
      await client.query(
        `INSERT INTO app_workflow_stage_instances VALUES
        ($1, $2, $3, 1, 'COMPLETED', null),
        ($4, $2, $5, 2, 'COMPLETED', $6)`,
        [
          originId,
          workflowId,
          otherStageId,
          nestedId,
          stageDefinitionId,
          JSON.stringify(
            scenario === "cycle"
              ? { sourceStageInstanceId: nestedId }
              : context,
          ),
        ],
      );
      if (scenario === "foreign") {
        await client.query(
          "UPDATE app_workflow_stage_instances SET workflow_instance_id=$1 WHERE id=$2",
          [randomUUID(), originId],
        );
      }
      const startContext =
        scenario === "empty"
          ? null
          : ["nested", "cycle"].includes(scenario)
            ? { sourceStageInstanceId: nestedId }
            : context;
      const statement = sql`SELECT ${workflowReworkContinuationContext(
        sql`${JSON.stringify(startContext)}::jsonb`,
        sql`${workflowId}::uuid`,
        sql`${scenario === "finished" ? otherStageId : stageDefinitionId}::uuid`,
      )} AS context`;
      const query = dialect.sqlToQuery(statement);
      const result = await client.query(query.sql, query.params);
      expect(result.rows[0].context).toEqual(
        ["continue", "nested"].includes(scenario) ? context : null,
      );
    },
  );
});
