import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";

// CMS event foreign keys are installed by the migration because Payload owns
// the CMS schema. Keep application schema generation out of CMS tables.
export const eventRegistrationSettings = pgTable(
  "app_event_registration_settings",
  {
    eventId: integer("event_id").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    confirmationEnabled: boolean("confirmation_enabled")
      .notNull()
      .default(true),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    reminderHours: integer("reminder_hours").notNull().default(24),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "event_registration_window",
      sql`${table.opensAt} IS NULL OR ${table.closesAt} IS NULL OR ${table.opensAt} < ${table.closesAt}`,
    ),
    check(
      "event_reminder_hours",
      sql`${table.reminderHours} BETWEEN 1 AND 168`,
    ),
  ],
);

export const eventRegistrations = pgTable(
  "app_event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: integer("event_id").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    organisation: text("organisation"),
    emailConsent: boolean("email_consent").notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_event_registrations_event_id_email_key").on(
      table.eventId,
      table.email,
    ),
    index("app_event_registrations_page_idx").on(
      table.eventId,
      table.registeredAt.desc(),
      table.id.desc(),
    ),
    check("event_email_consent", sql`${table.emailConsent}`),
    check(
      "event_full_name",
      sql`length(trim(${table.fullName})) BETWEEN 1 AND 200`,
    ),
    check(
      "event_email_normalized",
      sql`${table.email} = lower(trim(${table.email})) AND length(${table.email}) BETWEEN 3 AND 320`,
    ),
    check("event_organisation", sql`length(${table.organisation}) <= 200`),
  ],
);

export const eventRegistrationAudit = pgTable(
  "app_event_registration_audit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: integer("event_id").notNull(),
    registrationId: uuid("registration_id").references(
      () => eventRegistrations.id,
      { onDelete: "restrict" },
    ),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    details: jsonb("details").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_event_registration_audit_event_idx").on(
      table.eventId,
      table.createdAt.desc(),
    ),
    check(
      "event_registration_audit_action",
      sql`${table.action} IN ('REGISTERED', 'SETTINGS_UPDATED', 'PARTICIPANTS_READ')`,
    ),
  ],
);
