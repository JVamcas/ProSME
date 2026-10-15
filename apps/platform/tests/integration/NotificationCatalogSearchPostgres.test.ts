import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: () => database }));
import { listNotificationTemplateTargets } from "@/modules/notifications/infrastructure/NotificationTemplateTargetReadRepository";

const url = process.env.CATALOG_SEARCH_DATABASE_URL;
const client = url ? new Client({ connectionString: url }) : null;
const database = client ? drizzle(client) : null;
const [
  email,
  otherChannel,
  application,
  workflow,
  literal,
  global,
  appTarget,
  workflowTarget,
  eventTarget,
  literalTarget,
  otherTarget,
] = Array.from({ length: 11 }, () => randomUUID());

beforeAll(async () => {
  if (!client) return;
  if (!["localhost", "127.0.0.1"].includes(new URL(url!).hostname))
    throw new Error("Use disposable local PostgreSQL.");
  await client.connect();
  await client.query(`
    CREATE TEMP TABLE app_notification_channels(id uuid PRIMARY KEY, code text);
    CREATE TEMP TABLE app_notification_catalogs(id uuid PRIMARY KEY, catalog_key text, display_name text, description text);
    CREATE TEMP TABLE app_notification_events(id uuid PRIMARY KEY, catalog_id uuid, event_key text, display_name text, description text);
    CREATE TEMP TABLE app_notification_template_targets(id uuid PRIMARY KEY, channel_id uuid, catalog_id uuid, event_id uuid,
      scope text, default_subject_template text DEFAULT 'Subject', is_enabled boolean DEFAULT true, updated_at timestamptz DEFAULT now());
    CREATE TEMP TABLE app_notification_template_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_target_id uuid,
      created_at timestamptz DEFAULT now(), status text, version_number integer);
  `);
  await client.query(
    "INSERT INTO app_notification_channels VALUES ($1,'EMAIL'),($2,'OTHER')",
    [email, otherChannel],
  );
  await client.query(
    "INSERT INTO app_notification_catalogs VALUES ($1,'APPLICATIONS','Applications','Funding application lifecycle'),($2,'WORKFLOW','Workflow','Review and routing'),($3,'LITERAL','100%_coverage','Backslash \\ path')",
    [application, workflow, literal],
  );
  const event = randomUUID();
  await client.query(
    "INSERT INTO app_notification_events VALUES ($1,$2,'workflow.task.assigned','Task assigned','Reviewer assignment')",
    [event, workflow],
  );
  await client.query(
    `INSERT INTO app_notification_template_targets(id,channel_id,catalog_id,event_id,scope) VALUES
    ($1,$7,NULL,NULL,'GLOBAL'), ($2,$7,$8,NULL,'CATALOG'),($3,$7,$9,NULL,'CATALOG'),
    ($4,$7,NULL,$10,'EVENT'),($5,$7,$11,NULL,'CATALOG'),($6,$12,$9,NULL,'CATALOG')`,
    [
      global,
      appTarget,
      workflowTarget,
      eventTarget,
      literalTarget,
      otherTarget,
      email,
      application,
      workflow,
      event,
      literal,
      otherChannel,
    ],
  );
  await client.query(
    "INSERT INTO app_notification_template_versions(template_target_id,status,version_number) VALUES ($1,'RETIRED',1),($1,'PUBLISHED',2),($1,'DRAFT',3)",
    [workflowTarget],
  );
});
afterAll(async () => {
  await client?.end();
});

describe.skipIf(!url)(
  "notification template catalog search on PostgreSQL",
  () => {
    it("returns the channel's full target list for blank or omitted searches", async () => {
      const results = await listNotificationTemplateTargets("EMAIL");
      expect(results.map((row) => row.id)).toEqual([
        global,
        appTarget,
        literalTarget,
        workflowTarget,
        eventTarget,
      ]);
      expect(
        (await listNotificationTemplateTargets("EMAIL", "   ")).map(
          (row) => row.id,
        ),
      ).toEqual(results.map((row) => row.id));
      expect(results.some((row) => row.id === otherTarget)).toBe(false);
    });
    it.each(["wOrKfLoW", "WORKFLOW", "routing"])(
      "finds catalogs and their event targets for %s",
      async (term) => {
        const rows = await listNotificationTemplateTargets("EMAIL", term);
        expect(rows.map((row) => row.id)).toEqual([
          global,
          workflowTarget,
          eventTarget,
        ]);
        expect(rows[1]).toMatchObject({
          catalogKey: "WORKFLOW",
          catalogName: "Workflow",
          versionCount: 3,
          publishedVersionNumber: 2,
        });
        expect(rows[2]).toMatchObject({
          catalogKey: "WORKFLOW",
          eventKey: "workflow.task.assigned",
          versionCount: 0,
        });
        expect(rows[1]).not.toHaveProperty("htmlTemplate");
      },
    );
    it("returns only the global fallback when no catalog matches", async () => {
      expect(
        (await listNotificationTemplateTargets("EMAIL", "missing")).map(
          (row) => row.id,
        ),
      ).toEqual([global]);
    });
    it.each(["%", "_", "\\"])(
      "treats %s as a literal search character",
      async (term) => {
        expect(
          (await listNotificationTemplateTargets("EMAIL", term)).map(
            (row) => row.id,
          ),
        ).toEqual([global, literalTarget]);
      },
    );
  },
);
