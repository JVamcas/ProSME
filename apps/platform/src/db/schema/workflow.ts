import {
  boolean,
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
  WorkflowCondition,
  WorkflowStageInput,
  WorkflowStatus,
  TaskTypeCode,
  WorkflowActionCode,
} from "@/modules/workflows/WorkflowTypes";
import { roles } from "./authorization";
import { users } from "./identity";

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
    sequence: integer("sequence").notNull(),
    initial: boolean("initial").notNull().default(false),
    applicantStatus: text("applicant_status")
      .$type<WorkflowStageInput["applicantStatus"]>()
      .notNull(),
    applicantLabel: text("applicant_label").notNull(),
    applicantDescription: text("applicant_description").notNull(),
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
    code: text("code").notNull(),
    name: text("name").notNull(),
    type: text("type").$type<TaskTypeCode>().notNull(),
    sequence: integer("sequence").notNull(),
    required: boolean("required").notNull().default(true),
    assignmentRoleId: uuid("assignment_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    assignmentUserId: uuid("assignment_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    config: jsonb("config").notNull().default({}),
  },
  (table) => [
    uniqueIndex("app_stage_tasks_stage_code_unique").on(
      table.stageId,
      table.code,
    ),
    uniqueIndex("app_stage_tasks_stage_sequence_unique").on(
      table.stageId,
      table.sequence,
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
    actionCode: text("action_code").$type<WorkflowActionCode>().notNull(),
    toStageId: uuid("to_stage_id").references(
      () => workflowStageDefinitions.id,
      { onDelete: "restrict" },
    ),
    terminalOutcome: text("terminal_outcome"),
    requiredCapability: text("required_capability").notNull(),
    condition: jsonb("condition").$type<WorkflowCondition | null>(),
  },
  (table) => [
    uniqueIndex("app_workflow_transitions_source_action_unique").on(
      table.versionId,
      table.fromStageId,
      table.actionCode,
    ),
    index("app_workflow_transitions_version_idx").on(table.versionId),
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
