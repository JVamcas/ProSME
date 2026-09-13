import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const applicantProfiles = pgTable("app_applicant_profiles", {
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
}, (table) => [
  uniqueIndex("app_applicant_profiles_user_unique").on(table.userId),
]);

export const businessProfiles = pgTable("app_business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  legalName: text("legal_name").notNull(),
  tradingName: text("trading_name").notNull().default(""),
  registrationNumber: text("registration_number").notNull().default(""),
  businessType: text("business_type").notNull(),
  sector: text("sector").notNull(),
  region: text("region").notNull(),
  physicalAddress: text("physical_address").notNull(),
  establishedYear: integer("established_year"),
  employeeCount: integer("employee_count"),
  ...timestamps,
}, (table) => [
  index("app_business_profiles_user_idx").on(table.userId),
]);

export const profileAuditEntries = pgTable("app_profile_audit_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  changes: jsonb("changes").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("app_profile_audit_entity_idx").on(table.entityType, table.entityId),
]);

export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
export type BusinessProfile = typeof businessProfiles.$inferSelect;
