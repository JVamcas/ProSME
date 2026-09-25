import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  WorkflowChecklistEvidenceRequirement,
  WorkflowChecklistResponseType,
} from "../domain/definitions/WorkflowStageChecklistDefinition";
import type {
  WorkflowDocumentActor,
  WorkflowDocumentFileType,
  WorkflowDocumentVerifierActor,
} from "../domain/definitions/WorkflowStageDocumentRequirement";
import type { WorkflowScoringAggregation } from "../domain/definitions/WorkflowStageScoringDefinition";
import {
  stageTaskDefinitions,
  workflowStageDefinitions,
} from "./workflow.schema";

export const workflowStageChecklistDefinitions = pgTable(
  "app_workflow_stage_checklist_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    taskDefinitionId: uuid("task_definition_id")
      .notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    text: text("text").notNull(),
    mandatory: boolean("mandatory").notNull().default(false),
    responseType: text("response_type")
      .$type<WorkflowChecklistResponseType>()
      .notNull(),
    evidenceRequirement: text("evidence_requirement")
      .$type<WorkflowChecklistEvidenceRequirement>()
      .notNull(),
    notes: text("notes").notNull().default(""),
    displayOrder: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("app_stage_checklists_stage_key_unique").on(
      table.stageId,
      table.key,
    ),
    uniqueIndex("app_stage_checklists_stage_order_unique").on(
      table.stageId,
      table.displayOrder,
    ),
    index("app_stage_checklists_task_idx").on(table.taskDefinitionId),
  ],
);

export const workflowStageDocumentRequirements = pgTable(
  "app_workflow_stage_document_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    taskDefinitionId: uuid("task_definition_id")
      .notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    mandatory: boolean("mandatory").notNull().default(false),
    acceptedFileTypes: jsonb("accepted_file_types")
      .$type<WorkflowDocumentFileType[]>()
      .notNull(),
    maximumSizeMb: integer("maximum_size_mb").notNull(),
    expiryDays: integer("expiry_days"),
    uploader: text("uploader").$type<WorkflowDocumentActor>().notNull(),
    verifier: text("verifier")
      .$type<WorkflowDocumentVerifierActor>()
      .notNull(),
    templateReference: text("template_reference").notNull().default(""),
  },
  (table) => [
    uniqueIndex("app_stage_documents_stage_name_unique").on(
      table.stageId,
      table.name,
    ),
    index("app_stage_documents_stage_idx").on(table.stageId),
    index("app_stage_documents_task_idx").on(table.taskDefinitionId),
  ],
);

export const workflowStageScoringConfigurations = pgTable(
  "app_workflow_stage_scoring_configurations",
  {
    stageId: uuid("stage_id")
      .primaryKey()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    aggregation: text("aggregation")
      .$type<WorkflowScoringAggregation>()
      .notNull(),
    taskDefinitionId: uuid("task_definition_id")
      .notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("app_stage_scoring_task_idx").on(table.taskDefinitionId),
  ],
);

export const workflowStageScoringCriteria = pgTable(
  "app_workflow_stage_scoring_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageScoringConfigurations.stageId, {
        onDelete: "restrict",
      }),
    criterion: text("criterion").notNull(),
    description: text("description").notNull().default(""),
    weight: doublePrecision("weight").notNull(),
    scaleMinimum: doublePrecision("scale_minimum").notNull(),
    scaleMaximum: doublePrecision("scale_maximum").notNull(),
    // Legacy values are retained but no longer used by scoring.
    threshold: doublePrecision("threshold"),
    mandatoryComment: boolean("mandatory_comment").notNull().default(false),
  },
  (table) => [
    uniqueIndex("app_stage_scoring_criteria_name_unique").on(
      table.stageId,
      table.criterion,
    ),
    index("app_stage_scoring_criteria_stage_idx").on(table.stageId),
  ],
);
