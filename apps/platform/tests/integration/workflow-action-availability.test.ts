import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
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
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowActionAvailabilitySource } from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import {
  formContextIds as id,
  installWorkflowEligibilityFormContextFixture,
} from "../support/WorkflowEligibilityFormContextFixture";

const enabled = process.env.RUN_WORKFLOW_ACTION_AVAILABILITY_DATABASE_TESTS === "true";
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
let client: pg.PoolClient;

beforeAll(async () => {
  if (!pool) return;
  client = await pool.connect();
  await client.query("BEGIN");
  vi.mocked(getDatabase).mockReturnValue(drizzle(client) as never);
  await installWorkflowEligibilityFormContextFixture(client);
});

beforeEach(async () => {
  if (enabled) await client.query("SAVEPOINT availability_case");
});

afterEach(async () => {
  if (enabled) await client.query("ROLLBACK TO SAVEPOINT availability_case");
});

afterAll(async () => {
  if (client) {
    await client.query("ROLLBACK");
    client.release();
  }
  await pool?.end();
});

function readAvailability(overrides: Partial<{
  actorId: string;
  sourceStageInstanceId: string;
  taskId: string;
  workflowInstanceId: string;
}> = {}) {
  return readWorkflowActionAvailabilitySource({
    actorId: id.actor,
    sourceStageInstanceId: id.stageInstance,
    taskId: id.inheritedTask,
    workflowInstanceId: id.workflow,
    ...overrides,
  });
}

(enabled ? describe : describe.skip)("workflow task action availability against PostgreSQL", () => {
  it("loads a cleared task and its readiness within the owning stage", async () => {
    const source = await readAvailability();

    expect(source?.task).toMatchObject({
      assignedToActor: true,
      definitionId: id.inheritedDefinition,
      id: id.inheritedTask,
    });
    expect(source?.stage.stageInstanceId).toBe(id.stageInstance);
    expect(source?.stage.approvalEligibilityReady).toBe(false);
    expect(source?.actions).toEqual([]);
  });

  it("rejects a task belonging to another stage", async () => {
    const otherStageInstance = crypto.randomUUID();
    await client.query(
      `INSERT INTO app_workflow_stage_instances
        (id, workflow_instance_id, workflow_stage_definition_id, iteration_number, activated_at)
       VALUES ($1, $2, $3, 2, now())`,
      [otherStageInstance, id.workflow, id.stage],
    );
    await client.query(
      "UPDATE app_workflow_tasks SET stage_instance_id = $2 WHERE id = $1",
      [id.boundTask, otherStageInstance],
    );
    const clearance = await client.query(
      "SELECT app_workflow_task_coi_cleared($1, $2) AS cleared",
      [id.boundTask, id.actor],
    );
    expect(clearance.rows[0].cleared).toBe(true);

    expect(await readAvailability({ taskId: id.boundTask })).toBeNull();
  });

  it("rejects an actor without conflict-of-interest clearance", async () => {
    expect(await readAvailability({ actorId: id.otherActor })).toBeNull();
  });

  it("rejects a stage outside the requested workflow", async () => {
    expect(await readAvailability({ workflowInstanceId: crypto.randomUUID() })).toBeNull();
  });
});
