import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { getTableColumns, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  notificationOutbox,
  notificationDeliveries,
} from "@/modules/notifications/infrastructure/notification.schema";
import type { NotificationOccurrenceTransaction } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";
import type { WorkflowActionNotification } from "@/modules/workflows/domain/actions/WorkflowActionNotification";

const connectionString = process.env.ACTION_NOTIFICATION_DATABASE_URL;
const enabled = Boolean(connectionString);
const client = enabled ? new Client({ connectionString }) : null;
const db = client ? drizzle(client) : null;
const ids = Array.from({ length: 12 }, () => randomUUID());
const [
  owner,
  actor,
  inactive,
  role,
  application,
  workflow,
  stage,
  definition,
  channel,
  catalog,
] = ids;
const migration = () =>
  readFile(
    new URL(
      "../../../drizzle/0212_workflow_action_notifications.sql",
      import.meta.url,
    ),
    "utf8",
  );

function row(
  recipientType: WorkflowActionNotification["recipientType"],
  recipientId: string | null = null,
): WorkflowActionNotification {
  return {
    id: randomUUID(),
    condition: null,
    recipientType,
    recipientId,
    subject: "Decision {{fundingcalltitle}}",
    body: "<p>Hello {{recipientname}}</p>",
  };
}
function occurrence(key = "execution:row") {
  return {
    id: randomUUID(),
    occurrenceKey: key,
    context: {
      applicationId: application,
      applicationReference: "SME-1",
      fundingOpportunityTitle: "Growth",
      stageName: "Assessment",
      actionLabel: "Approve",
      actorName: "Reviewer",
      subjectTemplate: "Decision {{fundingcalltitle}}",
      htmlTemplate: "<p>Hello {{recipientname}}</p>",
      plainTextTemplate: "Hello {{recipientname}}",
    },
    recipients: [
      {
        notificationId: ids[10],
        userId: owner,
        displayName: "Owner",
        email: "owner@example.test",
        recipientType: "APPLICATION_OWNER" as const,
      },
    ],
  };
}
async function transaction<T>(
  run: (tx: NotificationOccurrenceTransaction) => Promise<T>,
) {
  return db!.transaction((tx) =>
    run(tx as unknown as NotificationOccurrenceTransaction),
  );
}

beforeAll(async () => {
  if (!client) return;
  if (!["localhost", "127.0.0.1"].includes(new URL(connectionString!).hostname))
    throw new Error("Use a disposable local test database.");
  await client.connect();
  await client.query(`
    CREATE TEMP TABLE app_users(id uuid PRIMARY KEY, display_name text, email text, status text);
    CREATE TEMP TABLE app_user_roles(user_id uuid, role_id uuid);
    CREATE TEMP TABLE app_applications(id uuid PRIMARY KEY, owner_user_id uuid);
    CREATE TEMP TABLE app_workflow_instances(id uuid PRIMARY KEY, application_id uuid);
    CREATE TEMP TABLE app_workflow_stage_definitions(id uuid PRIMARY KEY, name text);
    CREATE TEMP TABLE app_workflow_stage_instances(id uuid PRIMARY KEY, workflow_stage_definition_id uuid, workflow_instance_id uuid);
    CREATE TEMP TABLE app_workflow_tasks(stage_instance_id uuid, assigned_user_id uuid, status text);
    CREATE TEMP TABLE app_notification_catalogs(id uuid PRIMARY KEY, catalog_key text);
    CREATE TEMP TABLE app_notification_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), catalog_id uuid, event_key text UNIQUE, display_name text, description text, rule_eligibility text, is_enabled boolean DEFAULT true);
    CREATE TEMP TABLE app_notification_channels(id uuid PRIMARY KEY, code text, is_enabled boolean);
    CREATE TEMP TABLE app_workflow_action_definitions(id uuid PRIMARY KEY);
  `);
  for (const table of [notificationOutbox, notificationDeliveries]) {
    const columns = Object.values(getTableColumns(table)).map((column) => {
      let suffix =
        column.name === "id" ? " PRIMARY KEY DEFAULT gen_random_uuid()" : "";
      if (
        [
          "created_at",
          "updated_at",
          "available_at",
          "next_attempt_at",
        ].includes(column.name)
      )
        suffix = " DEFAULT now()";
      if (column.name === "attempt_count") suffix = " DEFAULT 0";
      if (column.name === "status") suffix = " DEFAULT 'PENDING'";
      return `"${column.name}" ${column.getSQLType()}${suffix}`;
    });
    await client.query(
      `CREATE TEMP TABLE ${getTableName(table)} (${columns.join(",")})`,
    );
  }
  await client.query(
    "ALTER TABLE app_notification_outbox ADD UNIQUE(event_key,occurrence_key)",
  );
  await client.query(
    "ALTER TABLE app_notification_deliveries ADD UNIQUE(outbox_id,channel_id,recipient_email)",
  );
  await client.query(
    "INSERT INTO app_notification_catalogs VALUES ($1,'WORKFLOW')",
    [catalog],
  );
  await client.query(
    "INSERT INTO app_notification_channels VALUES ($1,'EMAIL',true)",
    [channel],
  );
  await client.query(await migration());
  await client.query(
    "INSERT INTO app_users VALUES ($1,'Owner','owner@example.test','active'),($2,'Reviewer','reviewer@example.test','active'),($3,'Inactive','inactive@example.test','inactive')",
    [owner, actor, inactive],
  );
  await client.query("INSERT INTO app_user_roles VALUES ($1,$3),($2,$3)", [
    actor,
    inactive,
    role,
  ]);
  await client.query("INSERT INTO app_applications VALUES ($1,$2)", [
    application,
    owner,
  ]);
  await client.query("INSERT INTO app_workflow_instances VALUES ($1,$2)", [
    workflow,
    application,
  ]);
  await client.query(
    "INSERT INTO app_workflow_stage_definitions VALUES ($1,'Assessment')",
    [definition],
  );
  await client.query(
    "INSERT INTO app_workflow_stage_instances VALUES ($1,$2,$3)",
    [stage, definition, workflow],
  );
  await client.query(
    "INSERT INTO app_workflow_tasks VALUES ($1,$2,'IN_PROGRESS'),($1,$2,'COMPLETED'),($1,$3,'CANCELLED'),($4,$3,'IN_PROGRESS')",
    [stage, actor, owner, randomUUID()],
  );
});
afterAll(async () => {
  await client?.end();
});
beforeEach(async () => {
  if (client)
    await client.query(
      "TRUNCATE app_notification_deliveries, app_notification_outbox",
    );
});

export {
  enabled,
  client,
  ids,
  owner,
  actor,
  inactive,
  role,
  application,
  stage,
  row,
  occurrence,
  transaction,
  migration,
};
