import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  ApplicationBusinessSection,
  ApplicationFinancialSection,
  ApplicationProjectSection,
  ApplicationSectionCompletion,
} from "@/modules/applications/ApplicationSchemas";
import type { ApplicationDeclarationsSection } from "@/modules/applications/ApplicationDeclarationSchemas";
import { users } from "./identity";
import { workflowDefinitionVersions } from "./workflow";

export const applications = pgTable("app_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fundingOpportunityId: integer("funding_opportunity_id").notNull(),
  fundingOpportunityTitle: text("funding_opportunity_title").notNull(),
  status: text("status")
    .$type<"draft" | "submitted">()
    .notNull()
    .default("draft"),
  reference: text("reference"),
  workflowVersionId: uuid("workflow_version_id").references(
    () => workflowDefinitionVersions.id,
    { onDelete: "restrict" },
  ),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  currentSection: text("current_section")
    .$type<
      "business" | "project" | "financial" | "documents" | "declarations"
    >()
    .notNull()
    .default("business"),
  businessSection: jsonb("business_section")
    .$type<Partial<ApplicationBusinessSection>>()
    .notNull()
    .default({}),
  projectSection: jsonb("project_section")
    .$type<Partial<ApplicationProjectSection>>()
    .notNull()
    .default({}),
  financialSection: jsonb("financial_section")
    .$type<Partial<ApplicationFinancialSection>>()
    .notNull()
    .default({}),
  declarationsSection: jsonb("declarations_section")
    .$type<Partial<ApplicationDeclarationsSection>>()
    .notNull()
    .default({}),
  declarationAcceptance: jsonb("declaration_acceptance").$type<{
    acceptedAt: string;
    declarationVersion: string;
    privacyVersion: string;
  } | null>(),
  sectionCompletion: jsonb("section_completion")
    .$type<ApplicationSectionCompletion>()
    .notNull()
    .default({
      business: false,
      declarations: false,
      documents: false,
      financial: false,
      project: false,
    }),
  rowVersion: integer("row_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("app_applications_owner_opportunity_unique").on(
    table.ownerUserId,
    table.fundingOpportunityId,
  ),
  uniqueIndex("app_applications_reference_unique").on(table.reference),
  index("app_applications_owner_updated_idx").on(
    table.ownerUserId,
    table.updatedAt,
  ),
  index("app_applications_status_submitted_idx").on(
    table.status,
    table.submittedAt,
    table.id,
  ),
]);

export type ApplicationRecord = typeof applications.$inferSelect;
