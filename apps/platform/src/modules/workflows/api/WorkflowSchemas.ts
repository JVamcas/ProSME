import { z } from "zod";

import { workflowTaskSchema } from "./WorkflowTaskSchemas";

import { workflowStatuses } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";
import { validateWorkflowTransitions } from "@/modules/workflows/domain/transitions/WorkflowTransitionValidation";
import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import {
  workflowChecklistEvidenceRequirements,
  workflowChecklistResponseTypes,
} from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import {
  workflowDocumentActors,
  workflowDocumentFileTypes,
  workflowDocumentVerifierActors,
} from "@/modules/workflows/domain/definitions/WorkflowStageDocumentRequirement";
import { workflowScoringAggregations } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";

export { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
export { workflowTaskSchema } from "./WorkflowTaskSchemas";

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const workflowStageChecklistSchema = z
  .object({
    id: z.string().uuid().optional(),
    taskStableKey: codeSchema,
    key: codeSchema,
    text: z.string().trim().min(2).max(500),
    mandatory: z.boolean(),
    responseType: z.enum(workflowChecklistResponseTypes),
    evidenceRequirement: z.enum(workflowChecklistEvidenceRequirements),
    notes: z.string().trim().max(1000),
    displayOrder: z.number().int().positive(),
  })
  .strict();

export const workflowStageCommentFieldSchema = z
  .object({
    id: z.uuid().optional(),
    taskStableKey: codeSchema,
    key: codeSchema,
    label: z.string().trim().min(2).max(160),
    helpText: z.string().trim().max(1000),
    mandatory: z.boolean(),
    displayOrder: z.number().int().positive(),
  })
  .strict();

export const workflowStageDocumentRequirementSchema = z
  .object({
    id: z.string().uuid().optional(),
    stableKey: codeSchema,
    taskStableKey: codeSchema,
    name: z.string().trim().min(2).max(160),
    mandatory: z.boolean(),
    acceptedFileTypes: z
      .array(z.enum(workflowDocumentFileTypes))
      .min(1)
      .max(workflowDocumentFileTypes.length)
      .refine(
        (values) => new Set(values).size === values.length,
        "Accepted file types must be unique.",
      ),
    maximumSizeMb: z.number().int().min(1).max(100),
    expiryDays: z.number().int().min(1).max(3650).nullable(),
    requestOnStageActivation: z.boolean(),
    uploader: z.enum(workflowDocumentActors),
    verifier: z.enum(workflowDocumentVerifierActors),
    templateReference: z.string().trim().max(500),
  })
  .strict();

export const workflowStageScoringCriterionSchema = z
  .object({
    id: z.string().uuid().optional(),
    stableKey: codeSchema,
    criterion: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000),
    weight: z.number().positive().max(100),
    scaleMinimum: z.number().min(0).max(1000),
    scaleMaximum: z.number().positive().max(1000),
    mandatoryComment: z.boolean(),
  })
  .strict()
  .superRefine((criterion, context) => {
    if (criterion.scaleMaximum <= criterion.scaleMinimum) {
      context.addIssue({
        code: "custom",
        message: "Scale maximum must be greater than scale minimum.",
        path: ["scaleMaximum"],
      });
    }
  });

export const workflowStageScoringSchema = z
  .object({
    aggregation: z.enum(workflowScoringAggregations),
    criteria: z.array(workflowStageScoringCriterionSchema).max(100),
    taskStableKey: codeSchema,
  })
  .strict()
  .superRefine((scoring, context) => {
    const stableKeys = scoring.criteria.map((criterion) => criterion.stableKey);
    if (new Set(stableKeys).size !== stableKeys.length) {
      context.addIssue({
        code: "custom",
        message:
          "Scoring criterion stable keys must be unique within the stage.",
        path: ["criteria"],
      });
    }
    const criterionNames = scoring.criteria.map((criterion) =>
      criterion.criterion.toLowerCase(),
    );
    if (new Set(criterionNames).size !== criterionNames.length) {
      context.addIssue({
        code: "custom",
        message: "Scoring criteria must be unique within the stage.",
        path: ["criteria"],
      });
    }
  });

export const workflowStageSchema = z
  .object({
    id: z.string().uuid().optional(),
    stableKey: codeSchema,
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).default(""),
    enabled: z.boolean(),
    optional: z.boolean(),
    displayOrder: z.number().int().positive(),
    publicStatusMapping: z.object({
      status: z.enum(workflowPublicStatuses),
      label: z.string().trim().min(2).max(120),
      description: z.string().trim().min(2).max(300),
    }),
    repeatable: z.boolean(),
    coiGated: z.boolean(),
    entryCondition: conditionGroupSchema.nullable(),
    exitCondition: conditionGroupSchema.nullable(),
    checklistItems: z.array(workflowStageChecklistSchema).max(100),
    commentFields: z.array(workflowStageCommentFieldSchema).max(100).optional(),
    documentRequirements: z
      .array(workflowStageDocumentRequirementSchema)
      .max(100),
    scoring: workflowStageScoringSchema.nullable(),
    initial: z.boolean(),
    slaHours: z.number().int().positive().max(8760).nullable().optional(),
    actions: z.array(workflowActionDefinitionSchema),
    tasks: z.array(workflowTaskSchema),
  })
  .superRefine((stage, context) => {
    const checklistKeys = stage.checklistItems.map((item) => item.key);
    if (new Set(checklistKeys).size !== checklistKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Checklist keys must be unique within the stage.",
        path: ["checklistItems"],
      });
    }
    const checklistOrders = stage.checklistItems.map(
      (item) => item.displayOrder,
    );
    if (new Set(checklistOrders).size !== checklistOrders.length) {
      context.addIssue({
        code: "custom",
        message: "Checklist display orders must be unique within the stage.",
        path: ["checklistItems"],
      });
    }
    const taskKeys = new Set(stage.tasks.map((task) => task.stableKey));
    stage.checklistItems.forEach((item, index) => {
      if (!taskKeys.has(item.taskStableKey)) {
        context.addIssue({
          code: "custom",
          message: "Checklist items must reference a task in the same stage.",
          path: ["checklistItems", index, "taskStableKey"],
        });
      }
    });
    for (const property of ["key", "displayOrder"] as const) {
      const values = (stage.commentFields ?? []).map(
        (field) => field[property],
      );
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `Comment field ${property} must be unique within the stage.`,
          path: ["commentFields"],
        });
      }
    }
    (stage.commentFields ?? []).forEach((field, index) => {
      if (!taskKeys.has(field.taskStableKey)) {
        context.addIssue({
          code: "custom",
          message: "Comment fields must reference a task in the same stage.",
          path: ["commentFields", index, "taskStableKey"],
        });
      }
    });
    if (stage.scoring && !taskKeys.has(stage.scoring.taskStableKey)) {
      context.addIssue({
        code: "custom",
        message: "Scoring must reference a task in the same stage.",
        path: ["scoring", "taskStableKey"],
      });
    }
    stage.documentRequirements.forEach((requirement, index) => {
      if (!taskKeys.has(requirement.taskStableKey)) {
        context.addIssue({
          code: "custom",
          message:
            "Document requirements must reference a task in the same stage.",
          path: ["documentRequirements", index, "taskStableKey"],
        });
      }
    });
    const documentNames = stage.documentRequirements.map((requirement) =>
      requirement.name.toLowerCase(),
    );
    const documentKeys = stage.documentRequirements.map(
      (requirement) => requirement.stableKey,
    );
    if (new Set(documentKeys).size !== documentKeys.length) {
      context.addIssue({
        code: "custom",
        message:
          "Document requirement stable keys must be unique within the stage.",
        path: ["documentRequirements"],
      });
    }
    if (new Set(documentNames).size !== documentNames.length) {
      context.addIssue({
        code: "custom",
        message: "Document requirement names must be unique within the stage.",
        path: ["documentRequirements"],
      });
    }
    const decisionTasks = stage.tasks.filter(
      (task) => task.taskType === "STAGE_DECISION",
    );
    if (decisionTasks.length > 1) {
      context.addIssue({
        code: "custom",
        message: "A stage can contain at most one stage-decision task.",
        path: ["tasks"],
      });
    }
    const actionsByKey = new Map(
      stage.actions.map((action) => [action.stableKey, action]),
    );
    const actionKeys = new Set(actionsByKey.keys());
    stage.tasks.forEach((task, taskIndex) => {
      task.actionKeys.forEach((actionKey, actionIndex) => {
        if (!actionKeys.has(actionKey)) {
          context.addIssue({
            code: "custom",
            message: `Action ${actionKey} is not configured on this stage.`,
            path: ["tasks", taskIndex, "actionKeys", actionIndex],
          });
        }
      });
    });
  });

export { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";

export const workflowGraphSchema = z
  .object({
    stages: z.array(workflowStageSchema),
    transitions: z.array(workflowTransitionSchema),
  })
  .superRefine((graph, context) => {
    validateWorkflowTransitions(graph).forEach((error) => {
      context.addIssue({
        code: "custom",
        message: error.message,
        path: error.path.split("."),
      });
    });
  });

export const createWorkflowSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
});

export const updateWorkflowDetailsSchema = createWorkflowSchema.extend({
  expectedRowVersion: z.number().int().positive(),
});

export const updateWorkflowDraftSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  graph: workflowGraphSchema,
});

export const workflowCommandSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  versionId: z.string().uuid(),
});

export const opportunityAssignmentSchema = z.object({
  fundingOpportunityId: z.uuid(),
  fundingOpportunityTitle: z.string().trim().min(2).max(200),
  workflowVersionId: z.string().uuid(),
  expectedRowVersion: z.number().int().nonnegative().default(0),
});

export const workflowStatusSchema = z.enum(workflowStatuses);
