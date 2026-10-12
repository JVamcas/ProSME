import {
  actorId,
  actor,
  staff,
  settings,
  input,
} from "./fixtures/EventOperationsFixtures";
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
import { permissionCodes } from "@/auth/authorization/permissions";

const fixture = vi.hoisted(() => ({ database: null as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/modules/content/infrastructure/PayloadEventRepository", () => ({}));
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => fixture.database,
}));
import {
  registerForEvent,
  updateEventRegistrationSettings,
} from "@/modules/content/application/ServerEventRegistrationService";
import {
  getEventOperationsOverview,
  getEventOperationsParticipants,
  getEventOperationsDelivery,
} from "@/modules/content/application/ServerEventOperationsService";
import {
  prepareEventEmailDeliveries,
  withCurrentEventDelivery,
} from "@/modules/notifications/infrastructure/EventEmailDeliveryRepository";

const connectionString = process.env.EVENT_REGISTRATION_TEST_DATABASE_URL;
describe.skipIf(!connectionString)(
  "Event operations and delivery on isolated PostgreSQL",
  () => {
    let pool: Pool;
    const schema = `event_delivery_${crypto.randomUUID().replaceAll("-", "")}`;
    beforeAll(async () => {
      pool = new Pool({
        connectionString,
        max: 8,
        options: `-c search_path=${schema}`,
      });
      await pool.query(`CREATE SCHEMA ${schema}`);
      await pool.query(
        await readFile(
          new URL("./fixtures/EventDelivery.sql", import.meta.url),
          "utf8",
        ),
      );
      await pool.query("INSERT INTO app_users VALUES ($1)", [actorId]);
      for (const filename of [
        "0194_event_registration_foundation.sql",
        "0195_event_email_delivery.sql",
      ]) {
        const migration = await readFile(
          new URL(`../../../drizzle/${filename}`, import.meta.url),
          "utf8",
        );
        await pool.query(migration);
        await pool.query(migration);
      }
      fixture.database = drizzle(pool);
    });
    beforeEach(async () => {
      await pool.query(`TRUNCATE app_event_notification_intents, app_event_registration_audit, app_event_registrations, app_event_registration_settings, app_notification_deliveries, app_notification_outbox, cms_events;
      INSERT INTO cms_events VALUES (42,'Synthetic session','synthetic-session',now() + interval '30 hours',NULL,'Africa/Windhoek','Windhoek','published');`);
      await updateEventRegistrationSettings(staff, 42, settings);
    });
    afterAll(async () => {
      if (pool) {
        await pool.query(`DROP SCHEMA ${schema} CASCADE`);
        await pool.end();
      }
    });
    async function register() {
      await registerForEvent(42, input);
    }
    async function confirmationId() {
      const result = await pool.query(
        "SELECT outbox_id FROM app_event_notification_intents WHERE kind = 'CONFIRMATION'",
      );
      return result.rows[0].outbox_id as string;
    }
    it("captures concurrent registration and processor retries once and schedules relative to the event", async () => {
      await Promise.all(Array.from({ length: 6 }, register));
      await Promise.all([
        prepareEventEmailDeliveries(10),
        prepareEventEmailDeliveries(10),
      ]);
      const result = await pool.query(
        "SELECT (SELECT count(*)::int FROM app_event_registrations) registrations, (SELECT count(*)::int FROM app_notification_deliveries) deliveries, (SELECT count(*)::int FROM app_event_notification_intents) intents",
      );
      expect(result.rows[0]).toEqual({
        registrations: 1,
        deliveries: 1,
        intents: 2,
      });
      const reminder = await pool.query(
        "SELECT i.state, i.due_at = e.starts_at - interval '24 hours' correct FROM app_event_notification_intents i JOIN cms_events e ON e.id = i.event_id WHERE i.kind = 'REMINDER'",
      );
      expect(reminder.rows[0]).toEqual({ state: "PENDING", correct: true });
    });
    it("shows persisted sent, scheduled and failed states in cards and participant rows", async () => {
      await register();
      await prepareEventEmailDeliveries(10);
      await pool.query(
        "UPDATE app_notification_deliveries SET status = 'SENT', sent_at = now()",
      );
      const overview = await getEventOperationsOverview(staff, 42);
      expect(overview).toMatchObject({
        registered: 1,
        confirmationsSent: 1,
        remindersScheduled: 1,
        deliveryIssues: 0,
      });
      const participants = await getEventOperationsParticipants(staff, 42, {});
      expect(participants.items[0]).toMatchObject({
        confirmation: "Sent",
        reminder: "Scheduled",
      });
      await pool.query(
        "UPDATE app_notification_deliveries SET status = 'FAILED', sent_at = NULL",
      );
      expect(await getEventOperationsOverview(staff, 42)).toMatchObject({
        confirmationsSent: 0,
        deliveryIssues: 1,
      });
    });
    it("replaces queued reminders after published date changes and blocks obsolete retries", async () => {
      await register();
      await pool.query(
        "UPDATE cms_events SET starts_at = now() + interval '12 hours'",
      );
      await prepareEventEmailDeliveries(10);
      const old = await pool.query(
        "SELECT outbox_id FROM app_event_notification_intents WHERE kind = 'REMINDER'",
      );
      await pool.query(
        "UPDATE cms_events SET starts_at = now() + interval '60 hours'",
      );
      const send = vi.fn();
      expect(
        await withCurrentEventDelivery(old.rows[0].outbox_id, send),
      ).toBeNull();
      expect(send).not.toHaveBeenCalled();
      await prepareEventEmailDeliveries(10);
      const reminder = await pool.query(
        "SELECT i.state, i.outbox_id, i.due_at = e.starts_at - interval '24 hours' correct FROM app_event_notification_intents i JOIN cms_events e ON e.id = i.event_id WHERE i.kind = 'REMINDER'",
      );
      expect(reminder.rows[0]).toMatchObject({
        state: "PENDING",
        outbox_id: null,
        correct: true,
      });
    });
    it("cancels withdrawal and recreates one delivery on republishing", async () => {
      await register();
      await prepareEventEmailDeliveries(10);
      const old = await confirmationId();
      await pool.query("UPDATE cms_events SET _status = 'draft'");
      const send = vi.fn();
      expect(await withCurrentEventDelivery(old, send)).toBeNull();
      expect(send).not.toHaveBeenCalled();
      await prepareEventEmailDeliveries(10);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int count FROM app_event_notification_intents WHERE state = 'CANCELLED'",
          )
        ).rows[0].count,
      ).toBe(2);
      await pool.query("UPDATE cms_events SET _status = 'published'");
      await prepareEventEmailDeliveries(10);
      expect(await confirmationId()).not.toBe(old);
      await prepareEventEmailDeliveries(10);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int count FROM app_notification_deliveries WHERE status = 'PENDING'",
          )
        ).rows[0].count,
      ).toBe(1);
    });
    it("reconciles reminder settings atomically and enforces independent staff permissions", async () => {
      await register();
      await updateEventRegistrationSettings(staff, 42, {
        ...settings,
        reminderHours: 12,
      });
      expect(
        (
          await pool.query(
            "SELECT i.due_at = e.starts_at - interval '12 hours' correct FROM app_event_notification_intents i JOIN cms_events e ON e.id = i.event_id WHERE kind = 'REMINDER'",
          )
        ).rows[0].correct,
      ).toBe(true);
      await updateEventRegistrationSettings(staff, 42, {
        ...settings,
        reminderEnabled: false,
      });
      expect(
        (
          await pool.query(
            "SELECT state FROM app_event_notification_intents WHERE kind = 'REMINDER'",
          )
        ).rows[0].state,
      ).toBe("CANCELLED");
      await expect(getEventOperationsOverview(actor([]), 42)).rejects.toThrow();
      await expect(
        getEventOperationsOverview(
          actor([permissionCodes.eventRegistrationsReadAll], "disabled"),
          42,
        ),
      ).rejects.toThrow();
      await expect(
        getEventOperationsParticipants(
          actor([permissionCodes.eventEmailDeliveryReadAll]),
          42,
          {},
        ),
      ).rejects.toThrow();
      await expect(
        getEventOperationsDelivery(
          actor([permissionCodes.eventRegistrationsReadAll]),
          42,
          {},
        ),
      ).rejects.toThrow();
      const overview = await getEventOperationsOverview(
        actor([permissionCodes.eventRegistrationsReadAll]),
        42,
      );
      expect(overview).toMatchObject({
        settings: null,
        confirmationsSent: null,
        remindersScheduled: null,
        deliveryIssues: null,
      });
    });
    it("filters and pages participant projections in SQL", async () => {
      for (let index = 0; index < 5; index++)
        await registerForEvent(42, {
          ...input,
          email: `synthetic${index}@example.test`,
          fullName: `Name ${index}`,
        });
      const page = await getEventOperationsParticipants(staff, 42, {
        search: "Test Organisation",
        page: 2,
        pageSize: 2,
      });
      expect(page.total).toBe(5);
      expect(page.items).toHaveLength(2);
      expect(
        (await getEventOperationsParticipants(staff, 42, { search: "%" }))
          .total,
      ).toBe(0);
      expect(
        (
          await getEventOperationsParticipants(staff, 42, {
            page: 4,
            pageSize: 2,
          })
        ).items,
      ).toHaveLength(0);
    });
  },
);
