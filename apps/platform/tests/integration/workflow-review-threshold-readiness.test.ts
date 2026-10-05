import { randomUUID } from "node:crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { workflowTaskPrerequisitesSatisfied } from "@/modules/workflows/infrastructure/WorkflowTaskPrerequisiteReadiness";
import { loadRequiredTaskCompletions } from "@/modules/workflows/infrastructure/StageCompletionReadRepository";
import { requiredReviewCompletions } from "@/modules/workflows/domain/runtime/ReviewThreshold";

const enabled = process.env.RUN_REVIEW_THRESHOLD_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({ connectionString: process.env.DATABASE_URL })
  : null;
const schema = `review_readiness_${randomUUID().replaceAll("-", "")}`;
const stageId = randomUUID();
const otherStageId = randomUUID();
const definitionId = randomUUID();
const decisionDefinitionId = randomUUID();
const decisionId = randomUUID();
const reviewIds = [randomUUID(), randomUUID(), randomUUID()];

beforeAll(async () => {
  if (client) await client.connect();
});
afterAll(async () => {
  if (client) await client.end();
});
beforeEach(async () => {
  if (!client) return;
  await client.query("BEGIN");
  await client.query(`
    CREATE SCHEMA ${schema};
    SET LOCAL search_path TO ${schema}, public;
    CREATE TABLE app_workflow_stage_instances (
      id uuid PRIMARY KEY, workflow_stage_definition_id uuid
    );
    CREATE TABLE app_stage_task_definitions (
      id uuid PRIMARY KEY, stage_id uuid, code text, sequence integer,
      task_type text, required boolean, completion_mode text,
      reviewer_count integer, required_completion_count integer,
      completion_percentage integer, config jsonb DEFAULT '{}'
    );
    CREATE TABLE app_workflow_tasks (
      id uuid PRIMARY KEY, stage_instance_id uuid,
      workflow_task_definition_id uuid, status text, reviewer_slot integer,
      assigned_user_id uuid, supersedes_task_id uuid,
      form_version_id uuid, result jsonb DEFAULT '{}', coi_cleared boolean DEFAULT true
    );
    CREATE TABLE app_form_responses (
      workflow_task_id uuid, status text, values jsonb
    );
    CREATE FUNCTION app_workflow_task_coi_cleared(uuid, uuid)
    RETURNS boolean LANGUAGE sql AS $$
      SELECT coi_cleared FROM app_workflow_tasks WHERE id = $1
    $$;
  `);
  const stageDefinitionId = randomUUID();
  await client.query(
    "INSERT INTO app_workflow_stage_instances VALUES ($1, $2), ($3, $2)",
    [stageId, stageDefinitionId, otherStageId],
  );
  await client.query(
    `INSERT INTO app_stage_task_definitions
    (id, stage_id, code, sequence, task_type, required, completion_mode,
     reviewer_count, required_completion_count)
    VALUES ($1, $3, 'REVIEW', 1, 'CONTRIBUTING', true, 'COUNT', 3, 2),
           ($2, $3, 'DECISION', 2, 'STAGE_DECISION', true, 'COUNT', 1, 1)`,
    [definitionId, decisionDefinitionId, stageDefinitionId],
  );
  for (let index = 0; index < reviewIds.length; index++) {
    await client.query(
      `INSERT INTO app_workflow_tasks
      (id, stage_instance_id, workflow_task_definition_id, status, reviewer_slot, assigned_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reviewIds[index],
        stageId,
        definitionId,
        index < 2 ? "COMPLETED" : "PENDING",
        index + 1,
        randomUUID(),
      ],
    );
  }
  await client.query(
    `INSERT INTO app_workflow_tasks
    (id, stage_instance_id, workflow_task_definition_id, status, reviewer_slot)
    VALUES ($1, $2, $3, 'PENDING', 1)`,
    [decisionId, stageId, decisionDefinitionId],
  );
});
afterEach(async () => {
  if (client) await client.query("ROLLBACK");
});

async function prerequisites() {
  if (!client) throw new Error("Test database unavailable");
  const result = await drizzle(client).execute(sql`
    SELECT ${workflowTaskPrerequisitesSatisfied(sql`task`, sql`definition`)} AS ready
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition ON definition.id = task.workflow_task_definition_id
    WHERE task.id = ${decisionId}::uuid
  `);
  return result.rows[0].ready;
}

(enabled ? describe : describe.skip)(
  "review prerequisites in PostgreSQL",
  () => {
    it.each([
      ["COUNT", 2, null, true],
      ["ALL", 2, null, false],
      ["PERCENT", 2, 66, true],
      ["PERCENT", 2, 67, false],
    ] as const)(
      "honors %s with count %s and percentage %s",
      async (mode, count, percentage, expected) => {
        await client!.query(
          `UPDATE app_stage_task_definitions
      SET completion_mode = $1, required_completion_count = $2, completion_percentage = $3
      WHERE id = $4`,
          [mode, count, percentage, definitionId],
        );
        const requirements = await loadRequiredTaskCompletions(
          drizzle(client!) as never,
          stageId,
        );
        const review = requirements.find(
          (item) => item.taskDefinitionId === definitionId,
        )!;
        const required = requiredReviewCompletions(
          {
            mode: review.completionMode,
            count: review.requiredCompletionCount,
            percentage: review.completionPercentage,
            rounding: "CEIL",
          },
          review.denominator,
        );
        expect(review.completedCount >= required).toBe(expected);
        expect(await prerequisites()).toBe(expected);
      },
    );

    it("requires submitted form evidence and current COI clearance", async () => {
      const formId = randomUUID();
      await client!.query(
        "UPDATE app_workflow_tasks SET form_version_id = $1 WHERE id = $2",
        [formId, reviewIds[0]],
      );
      expect(await prerequisites()).toBe(false);
      await client!.query(
        "INSERT INTO app_form_responses VALUES ($1, 'COMPLETED', '{}')",
        [reviewIds[0]],
      );
      expect(await prerequisites()).toBe(true);
      await client!.query(
        "UPDATE app_workflow_tasks SET coi_cleared = false WHERE id = $1",
        [reviewIds[0]],
      );
      expect(await prerequisites()).toBe(false);
    });

    it("does not count reviews from a previous run or a superseded assignment", async () => {
      await client!.query(
        "UPDATE app_workflow_tasks SET stage_instance_id = $1 WHERE id = $2",
        [otherStageId, reviewIds[0]],
      );
      expect(await prerequisites()).toBe(false);
      await client!.query(
        "UPDATE app_workflow_tasks SET stage_instance_id = $1 WHERE id = $2",
        [stageId, reviewIds[0]],
      );
      await client!.query(
        "UPDATE app_workflow_tasks SET supersedes_task_id = $1 WHERE id = $2",
        [reviewIds[0], reviewIds[2]],
      );
      expect(await prerequisites()).toBe(false);
    });

    it("ignores optional review groups but blocks a required group with missing instances", async () => {
      await client!.query(
        "DELETE FROM app_workflow_tasks WHERE workflow_task_definition_id = $1",
        [definitionId],
      );
      expect(await prerequisites()).toBe(false);
      await client!.query(
        "UPDATE app_stage_task_definitions SET required = false WHERE id = $1",
        [definitionId],
      );
      expect(await prerequisites()).toBe(true);
    });
  },
);
