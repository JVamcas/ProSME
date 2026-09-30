import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const brandingSettings = pgTable(
  "app_branding_settings",
  {
    key: text("key").primaryKey(),
    logoContentType: text("logo_content_type").notNull(),
    logoFileName: text("logo_file_name").notNull(),
    logoObjectKey: text("logo_object_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("app_branding_settings_object_key_unique").on(
      table.logoObjectKey,
    ),
  ],
);

export type BrandingSettingsRecord = typeof brandingSettings.$inferSelect;
