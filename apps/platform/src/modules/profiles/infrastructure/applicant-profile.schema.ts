import { sql } from "drizzle-orm";
import { check, date, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";

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
    gender: text("gender"),
    nationality: text("nationality").notNull().default("Namibian"),
    region: text("region").notNull().default(""),
    postalAddress: text("postal_address").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("app_applicant_profiles_user_unique").on(table.userId),
    check(
      "app_applicant_profiles_gender_check",
      sql`${table.gender} IS NULL OR ${table.gender} IN ('Female', 'Male', 'Other', 'Prefer not to say')`,
    ),
  ],
);

export type ApplicantProfile = typeof applicantProfiles.$inferSelect;
