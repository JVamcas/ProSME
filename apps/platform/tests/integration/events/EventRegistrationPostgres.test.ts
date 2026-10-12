vi.mock(
  "@/modules/notifications/infrastructure/EventEmailDeliveryRepository",
  () => ({
    reconcileEventEmailIntents: vi.fn(),
  }),
);
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";

const fixture = vi.hoisted(() => ({ database: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => fixture.database,
}));
import {
  registerForEvent,
  getEventParticipants,
  updateEventRegistrationSettings,
} from "@/modules/content/application/ServerEventRegistrationService";

const connectionString = process.env.EVENT_REGISTRATION_TEST_DATABASE_URL;
const actorId = "00000000-0000-4000-8000-000000000001";
const actor = {
  id: actorId,
  status: "active",
  capabilities: new Set([
    permissionCodes.eventRegistrationsReadAll,
    permissionCodes.eventRegistrationSettingsUpdateAll,
  ]),
} as unknown as AuthenticatedUser;
const settings = {
  enabled: true,
  opensAt: null,
  closesAt: null,
  confirmationEnabled: true,
  reminderEnabled: true,
  reminderHours: 24,
};
const input = {
  fullName: "Synthetic Participant",
  email: "sample@example.test",
  emailConsent: true,
};

describe.skipIf(!connectionString)(
  "Event registrations on isolated PostgreSQL",
  () => {
    let pool: Pool;
    const schema = `events_test_${crypto.randomUUID().replaceAll("-", "")}`;

    beforeAll(async () => {
      pool = new Pool({
        connectionString,
        max: 5,
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA ${schema}`);
      await pool.query(`
      CREATE TABLE app_users(id uuid PRIMARY KEY);
      CREATE TABLE app_capabilities(code text PRIMARY KEY, description text);
      CREATE TABLE app_notification_outbox(id uuid PRIMARY KEY);
      CREATE TABLE cms_events(
        id integer PRIMARY KEY, title text, slug text, starts_at timestamptz,
        ends_at timestamptz, timezone text, location text, _status text
      );
      INSERT INTO app_users VALUES ('${actorId}');
    `);
      const migration = await readFile(
        new URL(
          "../../../drizzle/0194_event_registration_foundation.sql",
          import.meta.url,
        ),
        "utf8",
      );
      await pool.query(migration);
      await pool.query(migration);
      fixture.database = drizzle(pool);
    });

    beforeEach(async () => {
      await pool.query(`
      TRUNCATE app_event_notification_intents, app_event_registration_audit,
        app_event_registrations, app_event_registration_settings, cms_events;
      INSERT INTO cms_events VALUES
        (42, 'Published session', 'published-session', '2099-01-01T10:00:00Z', NULL, 'Africa/Windhoek', 'Windhoek', 'published'),
        (43, 'Draft session', 'draft-session', '2099-01-01T10:00:00Z', NULL, 'Africa/Windhoek', 'Windhoek', 'draft');
    `);
      await updateEventRegistrationSettings(actor, 42, settings);
    });

    afterAll(async () => {
      if (pool) {
        await pool.query(`DROP SCHEMA ${schema} CASCADE`);
        await pool.end();
      }
    });

    it("keeps one participant, audit and each intent on concurrent normalized retries", async () => {
      await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          registerForEvent(42, {
            ...input,
            email: index % 2 ? "SAMPLE@EXAMPLE.TEST" : input.email,
          }),
        ),
      );
      const participants = await pool.query(
        "SELECT id FROM app_event_registrations",
      );
      const audit = await pool.query(
        "SELECT id FROM app_event_registration_audit WHERE action = 'REGISTERED'",
      );
      const intents = await pool.query(
        "SELECT kind, published_snapshot, due_at FROM app_event_notification_intents ORDER BY kind",
      );
      expect(participants.rowCount).toBe(1);
      expect(audit.rowCount).toBe(1);
      expect(intents.rows.map((row) => row.kind)).toEqual([
        "CONFIRMATION",
        "REMINDER",
      ]);
      expect(intents.rows[0].published_snapshot).toMatchObject({
        id: 42,
        title: "Published session",
      });
      expect(intents.rows[1].due_at.toISOString()).toBe(
        "2098-12-31T10:00:00.000Z",
      );
    });

    it("rolls back the participant and audit if notification intent fails", async () => {
      await pool.query(`
      CREATE FUNCTION fail_event_intent() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'synthetic intent failure'; END $$;
      CREATE TRIGGER fail_event_intent BEFORE INSERT ON app_event_notification_intents
        FOR EACH ROW EXECUTE FUNCTION fail_event_intent();
    `);
      try {
        await expect(registerForEvent(42, input)).rejects.toMatchObject({
          cause: expect.objectContaining({
            message: "synthetic intent failure",
          }),
        });
        expect(
          (await pool.query("SELECT id FROM app_event_registrations")).rowCount,
        ).toBe(0);
        expect(
          (
            await pool.query(
              "SELECT id FROM app_event_registration_audit WHERE action = 'REGISTERED'",
            )
          ).rowCount,
        ).toBe(0);
      } finally {
        await pool.query(
          "DROP TRIGGER fail_event_intent ON app_event_notification_intents; DROP FUNCTION fail_event_intent()",
        );
      }
    });

    it("rejects unpublished, missing, disabled and elapsed events", async () => {
      await expect(registerForEvent(43, input)).rejects.toThrow(
        "published event not found",
      );
      await expect(registerForEvent(99, input)).rejects.toThrow(
        "published event not found",
      );
      await updateEventRegistrationSettings(actor, 42, {
        ...settings,
        enabled: false,
      });
      await expect(registerForEvent(42, input)).rejects.toThrow("closed");
      await updateEventRegistrationSettings(actor, 42, settings);
      await pool.query(
        "UPDATE cms_events SET starts_at = now() - interval '1 second' WHERE id = 42",
      );
      await expect(registerForEvent(42, input)).rejects.toThrow("closed");
    });

    it("honours future opening and elapsed closing boundaries", async () => {
      await updateEventRegistrationSettings(actor, 42, {
        ...settings,
        opensAt: "2098-01-01T00:00:00Z",
      });
      await expect(registerForEvent(42, input)).rejects.toThrow("closed");
      await updateEventRegistrationSettings(actor, 42, {
        ...settings,
        closesAt: "2000-01-01T00:00:00Z",
      });
      await expect(registerForEvent(42, input)).rejects.toThrow("closed");
    });

    it("keeps participant pagination, filtering, total and event scope in SQL", async () => {
      await registerForEvent(42, {
        ...input,
        fullName: "Alpha",
        organisation: "Business 100%",
      });
      await registerForEvent(42, {
        ...input,
        fullName: "Bravo",
        email: "bravo@example.test",
      });
      await registerForEvent(42, {
        ...input,
        fullName: "Charlie",
        email: "charlie@example.test",
      });
      await pool.query(
        "UPDATE cms_events SET _status = 'published' WHERE id = 43",
      );
      await updateEventRegistrationSettings(actor, 43, settings);
      await registerForEvent(43, { ...input, fullName: "Other event" });
      const first = await getEventParticipants(actor, 42, { pageSize: 2 });
      const second = await getEventParticipants(actor, 42, {
        page: 2,
        pageSize: 2,
      });
      const empty = await getEventParticipants(actor, 42, {
        page: 3,
        pageSize: 2,
      });
      expect(first.total).toBe(3);
      expect(first.items).toHaveLength(2);
      expect(second.items).toHaveLength(1);
      expect(empty.items).toEqual([]);
      expect(
        new Set([...first.items, ...second.items].map((item) => item.id)).size,
      ).toBe(3);
      expect(first.items[0]).not.toHaveProperty("emailConsent");
      const search = await getEventParticipants(actor, 42, { search: "100%" });
      expect(search.total).toBe(1);
      expect(search.items[0].fullName).toBe("Alpha");
    });

    it("enforces contextual grants before disclosing participants", async () => {
      await expect(
        getEventParticipants({ ...actor, capabilities: new Set() }, 42, {}),
      ).rejects.toThrow("Missing required capability");
      await expect(getEventParticipants(actor, 99, {})).rejects.toThrow(
        "event not found",
      );
    });

    it("persists only the configured email intents", async () => {
      await updateEventRegistrationSettings(actor, 42, {
        ...settings,
        reminderEnabled: false,
      });
      await registerForEvent(42, input);
      expect(
        (await pool.query("SELECT kind FROM app_event_notification_intents"))
          .rows,
      ).toEqual([{ kind: "CONFIRMATION" }]);
    });

    it("enforces identity linkage and consent constraints", async () => {
      await expect(
        pool.query(
          `INSERT INTO app_event_registrations(event_id, full_name, email, email_consent) VALUES (99, 'Synthetic', 's@example.test', true)`,
        ),
      ).rejects.toThrow();
      await expect(
        pool.query(
          `INSERT INTO app_event_registrations(event_id, full_name, email, email_consent) VALUES (42, 'Synthetic', 's@example.test', false)`,
        ),
      ).rejects.toThrow();
    });
  },
);
