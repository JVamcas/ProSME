import { randomUUID } from "node:crypto";
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
import {
  readApplicationWorkflowRfis,
  readAssignedApplicationWorkflowRfis,
} from "@/modules/workflows/infrastructure/WorkflowRfiReadRepository";

const enabled = process.env.RUN_RFI_AUDIENCE_DATABASE_TESTS === "true";
const client = enabled
  ? new pg.Client({ connectionString: process.env.DATABASE_URL })
  : null;
const schema = "rfi_audience_" + randomUUID().replaceAll("-", "");
const applicationId = randomUUID();
const actorId = randomUUID();
const otherActorId = randomUUID();
const taskId = randomUUID();
const requestId = randomUUID();

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
    CREATE TABLE app_applications (
      id uuid PRIMARY KEY, owner_user_id uuid, reference text, funding_opportunity_title text
    );
    CREATE TABLE app_workflow_tasks (
      id uuid PRIMARY KEY, assigned_user_id uuid, assigned_role_id uuid
    );
    CREATE TABLE app_user_roles (user_id uuid, role_id uuid);
    CREATE TABLE app_workflow_rfis (
      id uuid PRIMARY KEY, application_id uuid, task_id uuid, recipient_user_id uuid,
      status text, question text, instructions text, deadline_at timestamptz,
      row_version integer, created_at timestamptz, responded_at timestamptz
    );
  `);
  await client.query(
    "INSERT INTO app_applications VALUES ($1, $2, 'TEST-1', 'Test call')",
    [applicationId, actorId],
  );
  await client.query("INSERT INTO app_workflow_tasks VALUES ($1, $2, NULL)", [
    taskId,
    actorId,
  ]);
  await client.query(
    "INSERT INTO app_workflow_rfis VALUES ($1, $2, $3, $4, 'OPEN', 'Clarify budget', '<p>Provide details</p>', '2099-10-12', 1, now(), NULL)",
    [requestId, applicationId, taskId, actorId],
  );
  vi.mocked(getDatabase).mockReturnValue(drizzle(client) as never);
});
afterEach(async () => {
  if (client) await client.query("ROLLBACK");
});

(enabled ? describe : describe.skip)(
  "RFI audience projection in PostgreSQL",
  () => {
    it.each([
      [true, true, "RESPOND"],
      [true, false, "READ"],
      [false, true, null],
      [false, false, null],
    ] as const)(
      "checks applicant grants read=%s respond=%s",
      async (canRead, canRespond, expected) => {
        const access = { actorId, canRead, canRespond };
        const all = await readApplicationWorkflowRfis(applicationId, access);
        const assigned = await readAssignedApplicationWorkflowRfis(
          applicationId,
          actorId,
          access,
        );
        expect(all).toHaveLength(1);
        expect(assigned).toHaveLength(1);
        expect(all[0].applicantAccess).toBe(expected);
        expect(assigned[0].applicantAccess).toBe(expected);
        expect(all[0].applicationId).toBe(applicationId);
        expect(all[0].taskId).toBe(taskId);
        expect(all[0].id).toBe(requestId);
        expect(all[0].instructions).toBe("<p>Provide details</p>");
      },
    );

    it.each(["owner", "recipient"])(
      "requires the actor to match the %s",
      async (mismatch) => {
        if (mismatch === "owner") {
          await client!.query(
            "UPDATE app_applications SET owner_user_id = $1",
            [otherActorId],
          );
        } else {
          await client!.query(
            "UPDATE app_workflow_rfis SET recipient_user_id = $1",
            [otherActorId],
          );
        }
        const access = { actorId, canRead: true, canRespond: true };
        const all = await readApplicationWorkflowRfis(applicationId, access);
        const assigned = await readAssignedApplicationWorkflowRfis(
          applicationId,
          actorId,
          access,
        );
        expect(all[0].applicantAccess).toBeNull();
        expect(assigned[0].applicantAccess).toBeNull();
      },
    );

    it("does not grant applicant response access merely because the actor has all-scope staff visibility", async () => {
      const result = await readApplicationWorkflowRfis(applicationId, {
        actorId: otherActorId,
        canRead: true,
        canRespond: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].applicantAccess).toBeNull();
    });

    it("retains assignment and application filtering", async () => {
      const access = { actorId: otherActorId, canRead: true, canRespond: true };
      expect(
        await readAssignedApplicationWorkflowRfis(
          applicationId,
          otherActorId,
          access,
        ),
      ).toEqual([]);
      expect(await readApplicationWorkflowRfis(randomUUID(), access)).toEqual(
        [],
      );
      const roleId = randomUUID();
      await client!.query(
        "UPDATE app_workflow_tasks SET assigned_role_id = $1",
        [roleId],
      );
      await client!.query("INSERT INTO app_user_roles VALUES ($1, $2)", [
        otherActorId,
        roleId,
      ]);
      const assigned = await readAssignedApplicationWorkflowRfis(
        applicationId,
        otherActorId,
        access,
      );
      expect(assigned).toHaveLength(1);
      expect(assigned[0].applicantAccess).toBeNull();
    });
  },
);
