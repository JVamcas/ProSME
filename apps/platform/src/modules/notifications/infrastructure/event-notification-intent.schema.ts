import { sql } from "drizzle-orm";
import {
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
import { eventRegistrations } from "@/modules/content/infrastructure/event-registration.schema";
import { notificationOutbox } from "./notification.schema";

export const eventNotificationIntents = pgTable(
  "app_event_notification_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: "restrict" }),
    eventId: integer("event_id").notNull(),
    kind: text("kind").notNull(),
    revision: integer("revision").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    publishedSnapshot: jsonb("published_snapshot").notNull(),
    state: text("state").notNull().default("PENDING"),
    outboxId: uuid("outbox_id").references(() => notificationOutbox.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("app_event_notification_intents_registration_id_kind_key").on(
      table.registrationId,
      table.kind,
    ),
    index("app_event_notification_intents_due_idx").on(
      table.state,
      table.dueAt,
      table.id,
    ),
    check(
      "event_notification_kind",
      sql`${table.kind} IN ('CONFIRMATION', 'REMINDER')`,
    ),
    check(
      "event_notification_state",
      sql`${table.state} IN ('PENDING', 'CAPTURED', 'CANCELLED')`,
    ),
  ],
);
