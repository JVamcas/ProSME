import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const applicantProfiles = pgTable(
  "app_applicant_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull().default(""),
    surname: text("surname").notNull().default(""),
    position: text("position").notNull().default(""),
    phoneNumber: text("phone_number").notNull().default(""),
    dateOfBirth: date("date_of_birth"),
    nationality: text("nationality").notNull().default("Namibian"),
    region: text("region").notNull().default(""),
    postalAddress: text("postal_address").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("app_applicant_profiles_user_unique").on(table.userId),
  ],
);

export { businessProfiles } from "@/modules/businesses/infrastructure/business-profile.schema";
export type { BusinessProfile } from "@/modules/businesses/infrastructure/business-profile.schema";

export const profileAuditEntries = pgTable(
  "app_profile_audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_profile_audit_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
