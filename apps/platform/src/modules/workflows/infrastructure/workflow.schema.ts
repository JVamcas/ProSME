import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { WorkflowTemplateDetails } from "../domain/definitions/WorkflowTemplate";
import type { WorkflowActionType } from "../domain/actions/WorkflowActionDefinition";
import type { WorkflowActionConfiguration } from "../domain/actions/WorkflowActionConfiguration";
import type { WorkflowPublicStatus } from "../domain/definitions/WorkflowStageDefinition";
import type { WorkflowTaskAssignmentMode } from "../domain/definitions/WorkflowTaskDefinition";

import type {
  WorkflowStatus,
  TaskTypeCode,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { roles } from "@/db/schema/authorization";
import { formVersions } from "@/db/schema/forms";
import { users } from "@/db/schema/identity";

export const workflowDefinitions = pgTable(
  "app_workflow_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_definitions_code_unique").on(table.code),
  ],
);

export const workflowDefinitionVersions = pgTable(
  "app_workflow_definition_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => workflowDefinitions.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<WorkflowStatus>().notNull().default("DRAFT"),
    metadata: jsonb("metadata")
      .$type<WorkflowTemplateDetails>()
      .notNull()
      .default({ code: "", name: "", description: "" }),
    rowVersion: integer("row_version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_versions_definition_number_unique").on(
      table.definitionId,
      table.versionNumber,
    ),
    index("app_workflow_versions_definition_status_idx").on(
      table.definitionId,
      table.status,
    ),
  ],
);

export const workflowStageDefinitions = pgTable(
  "app_workflow_stage_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    optional: boolean("optional").notNull().default(false),
    sequence: integer("sequence").notNull(),
    initial: boolean("initial").notNull().default(false),
    applicantStatus: text("applicant_status")
      .$type<WorkflowPublicStatus>()
      .notNull(),
    applicantLabel: text("applicant_label").notNull(),
    applicantDescription: text("applicant_description").notNull(),
    repeatable: boolean("repeatable").notNull().default(false),
    coiGated: boolean("coi_gated").notNull().default(false),
    slaHours: integer("sla_hours"),
  },
  (table) => [
    uniqueIndex("app_workflow_stages_version_code_unique").on(
      table.versionId,
      table.code,
    ),
    uniqueIndex("app_workflow_stages_version_sequence_unique").on(
      table.versionId,
      table.sequence,
    ),
  ],
);

export const stageTaskDefinitions = pgTable(
  "app_stage_task_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    stableKey: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    type: text("type").$type<TaskTypeCode>().notNull(),
    displayOrder: integer("sequence").notNull(),
    required: boolean("required").notNull().default(true),
    roleId: uuid("assignment_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    namedUserOverrideId: uuid("assignment_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    assignmentMode: text("assignment_mode")
      .$type<WorkflowTaskAssignmentMode>()
      .notNull()
      .default("ROLE"),
    reviewerCount: integer("reviewer_count").notNull().default(1),
    requiredCompletionCount: integer("required_completion_count")
      .notNull()
      .default(1),
    quorum: boolean("quorum").notNull().default(false),
    coiRequired: boolean("coi_required").notNull().default(false),
    config: jsonb("config").notNull().default({}),
    formVersionId: uuid("form_version_id").references(() => formVersions.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    uniqueIndex("app_stage_tasks_stage_code_unique").on(
      table.stageId,
      table.stableKey,
    ),
    uniqueIndex("app_stage_tasks_stage_sequence_unique").on(
      table.stageId,
      table.displayOrder,
    ),
  ],
);

export const workflowActionDefinitions = pgTable(
  "app_workflow_action_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    stableKey: text("stable_key").notNull(),
    label: text("label").notNull(),
    actionType: text("action_type").$type<WorkflowActionType>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    reasonCodeRequired: boolean("reason_code_required")
      .notNull()
      .default(false),
    displayOrder: integer("display_order").notNull(),
    configuration: jsonb("configuration")
      .$type<WorkflowActionConfiguration>()
      .notNull(),
  },
  (table) => [
    uniqueIndex("app_workflow_actions_stage_key_unique").on(
      table.stageId,
      table.stableKey,
    ),
    uniqueIndex("app_workflow_actions_stage_order_unique").on(
      table.stageId,
      table.displayOrder,
    ),
  ],
);

export const workflowTransitionDefinitions = pgTable(
  "app_workflow_transition_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    fromStageId: uuid("from_stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    actionKey: text("action_key").notNull(),
    toStageId: uuid("to_stage_id").references(
      () => workflowStageDefinitions.id,
      { onDelete: "restrict" },
    ),
    terminalOutcome: text("terminal_outcome"),
    priority: integer("priority").notNull(),
  },
  (table) => [
    uniqueIndex("app_workflow_transitions_source_action_priority_unique").on(
      table.versionId,
      table.fromStageId,
      table.actionKey,
      table.priority,
    ),
    index("app_workflow_transitions_version_idx").on(table.versionId),
    foreignKey({
      columns: [table.fromStageId, table.actionKey],
      foreignColumns: [
        workflowActionDefinitions.stageId,
        workflowActionDefinitions.stableKey,
      ],
      name: "app_workflow_transitions_source_action_fk",
    }).onDelete("restrict"),
  ],
);

export const fundingOpportunityWorkflowAssignments = pgTable(
  "app_funding_opportunity_workflows",
  {
    fundingOpportunityId: integer("funding_opportunity_id").primaryKey(),
    fundingOpportunityTitle: text("funding_opportunity_title").notNull(),
    workflowVersionId: uuid("workflow_version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    assignedBy: uuid("assigned_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rowVersion: integer("row_version").notNull().default(1),
  },
  (table) => [
    index("app_funding_workflow_version_idx").on(table.workflowVersionId),
  ],
);
