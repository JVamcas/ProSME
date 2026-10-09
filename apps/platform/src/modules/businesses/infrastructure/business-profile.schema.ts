import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";

export const businessProfiles = pgTable(
  "app_business_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    legalName: text("legal_name").notNull(),
    tradingName: text("trading_name").notNull().default(""),
    registrationNumber: text("registration_number").notNull().default(""),
    businessType: text("business_type").notNull(),
    sector: text("sector").notNull(),
    secondarySector: text("secondary_sector"),
    region: text("region").notNull(),
    physicalAddress: text("physical_address").notNull(),
    establishedYear: integer("established_year"),
    employeeCount: integer("employee_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("app_business_profiles_user_idx").on(table.userId)],
);

export type BusinessProfile = typeof businessProfiles.$inferSelect;
