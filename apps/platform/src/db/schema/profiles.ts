import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity";

export { applicantProfiles } from "@/modules/profiles/infrastructure/applicant-profile.schema";
export type { ApplicantProfile } from "@/modules/profiles/infrastructure/applicant-profile.schema";

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
