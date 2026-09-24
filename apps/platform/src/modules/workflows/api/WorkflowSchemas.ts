import { z } from "zod";

import {
  workflowStatuses,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import { workflowTaskAssignmentModes } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";
import { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";
import { workflowTransitionSchema } from "@/modules/workflows/domain/transitions/WorkflowTransitionSchemas";
import { validateWorkflowTransitions } from "@/modules/workflows/domain/transitions/WorkflowTransitionValidation";
import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import { conditionFieldTypes } from "@/modules/conditions/domain/ConditionConfiguration";
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
import { workflowCommentFieldVisibilities } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";
import { staticPermissionCodes } from "@/auth/authorization/permissions";
import { workflowElementVisibilities } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export { workflowActionDefinitionSchema } from "@/modules/workflows/domain/actions/WorkflowActionSchemas";

const codeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const workflowStageChecklistSchema = z.object({
  id: z.string().uuid().optional(),
  key: codeSchema,
  text: z.string().trim().min(2).max(500),
  mandatory: z.boolean(),
  responseType: z.enum(workflowChecklistResponseTypes),
  evidenceRequirement: z.enum(workflowChecklistEvidenceRequirements),
  notes: z.string().trim().max(1000),
  displayOrder: z.number().int().positive(),
}).strict();

export const workflowStageDocumentRequirementSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  mandatory: z.boolean(),
  acceptedFileTypes: z.array(z.enum(workflowDocumentFileTypes))
    .min(1)
    .max(workflowDocumentFileTypes.length)
    .refine(
      (values) => new Set(values).size === values.length,
      "Accepted file types must be unique.",
    ),
  maximumSizeMb: z.number().int().min(1).max(100),
  expiryDays: z.number().int().min(1).max(3650).nullable(),
  uploader: z.enum(workflowDocumentActors),
  verifier: z.enum(workflowDocumentVerifierActors),
  templateReference: z.string().trim().max(500),
}).strict();

export const workflowStageScoringCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  criterion: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000),
  weight: z.number().positive().max(100),
  scaleMinimum: z.number().min(0).max(1000),
  scaleMaximum: z.number().positive().max(1000),
  threshold: z.number().min(0).max(1000),
  mandatoryComment: z.boolean(),
}).strict().superRefine((criterion, context) => {
  if (criterion.scaleMaximum <= criterion.scaleMinimum) {
    context.addIssue({
      code: "custom",
      message: "Scale maximum must be greater than scale minimum.",
      path: ["scaleMaximum"],
    });
  }
  if (
    criterion.threshold < criterion.scaleMinimum
    || criterion.threshold > criterion.scaleMaximum
  ) {
    context.addIssue({
      code: "custom",
      message: "Threshold must fall within the configured scale.",
      path: ["threshold"],
    });
  }
});

export const workflowStageScoringSchema = z.object({
  aggregation: z.enum(workflowScoringAggregations),
  criteria: z.array(workflowStageScoringCriterionSchema).max(100),
}).strict().superRefine((scoring, context) => {
  const criterionNames = scoring.criteria.map(
    (criterion) => criterion.criterion.toLowerCase(),
  );
  if (new Set(criterionNames).size !== criterionNames.length) {
    context.addIssue({
      code: "custom",
      message: "Scoring criteria must be unique within the stage.",
      path: ["criteria"],
    });
  }
});

export const workflowStageCommentFieldSchema = z.object({
  id: z.string().uuid().optional(),
  key: codeSchema,
  label: z.string().trim().min(2).max(160),
  helpText: z.string().trim().max(1000),
  mandatory: z.boolean(),
  visibility: z.enum(workflowCommentFieldVisibilities),
  displayOrder: z.number().int().positive(),
}).strict();
export const workflowTaskSchema = z
  .object({
    actionKeys: z.array(codeSchema).max(100).refine(
      (values) => new Set(values).size === values.length,
      "Task action bindings must be unique.",
    ),
    permissions: z.object({
      view: z.enum(staticPermissionCodes),
      edit: z.enum(staticPermissionCodes),
      decide: z.enum(staticPermissionCodes),
      visibility: z.enum(workflowElementVisibilities),
    }).strict(),
    id: z.string().uuid().optional(),
    stableKey: codeSchema,
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000),
    roleId: z.string().uuid().nullable().optional(),
    namedUserOverrideId: z.string().uuid().nullable().optional(),
    assignmentMode: z.enum(workflowTaskAssignmentModes),
    reviewerCount: z.number().int().positive().max(100),
    reviewRelease: z.enum(["STAGE_COMPLETED", "THRESHOLD_MET", "IMMEDIATE"]).optional(),
    requiredCompletionCount: z.number().int().positive().max(100),
    completionMode: z.enum(["ALL", "COUNT", "PERCENT"]).optional(),
    completionPercentage: z.number().int().min(1).max(100).nullable().optional(),
    quorum: z.boolean(),
    quorumRule: z.object({
      population: z.enum(["ASSIGNED_TASKS", "REGISTERED"]),
      minimumCount: z.number().int().positive().nullable(),
      minimumPercentage: z.number().int().min(1).max(100).nullable(),
      rounding: z.literal("CEIL"),
      chairRequired: z.boolean(),
      recusalDenominator: z.enum(["EXCLUDE", "INCLUDE"]),
      freeze: z.enum(["AT_DECISION", "ON_FIRST_PASS"]),
      abstentionsCountAsPresent: z.boolean(),
    }).strict().nullable().optional(),
    coiRequired: z.boolean(),
    displayOrder: z.number().int().positive(),
    required: z.boolean(),
    config: z.unknown(),
    formBinding: z.object({
      contextFields: z.array(z.object({
        key: z.string().regex(
          /^(application|fundingCall|workflow|stage|task)\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
          "Use an application, fundingCall, workflow, stage or task context path.",
        ),
        label: z.string().trim().min(2).max(160),
        type: z.enum(conditionFieldTypes),
      }).strict()).max(200).refine(
        (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
        "Selected context fields must be unique.",
      ),
      formVersionId: z.string().uuid(),
    }).strict().nullable(),
  })
  .strict()
  .superRefine((task, context) => {
    if (task.completionMode === "PERCENT" && !task.completionPercentage) {
      context.addIssue({
        code: "custom",
        message: "A percentage threshold requires a percentage.",
        path: ["completionPercentage"],
      });
    }
    if (task.completionMode !== "PERCENT" && task.completionPercentage) {
      context.addIssue({
        code: "custom",
        message: "A percentage applies only to percentage thresholds.",
        path: ["completionPercentage"],
      });
    }
    if (task.quorum && (!task.quorumRule || (
      task.quorumRule.minimumCount === null
      && task.quorumRule.minimumPercentage === null
    ))) {
      context.addIssue({
        code: "custom",
        message: "Quorum requires an independent participation rule.",
        path: ["quorumRule"],
      });
    }
    if (task.quorum && task.quorumRule?.population === "ASSIGNED_TASKS"
      && task.quorumRule.minimumCount !== null
      && task.quorumRule.minimumCount > task.reviewerCount) {
      context.addIssue({
        code: "custom",
        message: "Assigned-task quorum count cannot exceed the reviewer count.",
        path: ["quorumRule", "minimumCount"],
      });
    }
    if (task.requiredCompletionCount > task.reviewerCount) {
      context.addIssue({
        code: "custom",
        message: "Required completions cannot exceed the reviewer count.",
        path: ["requiredCompletionCount"],
      });
    }
    if (task.assignmentMode === "NAMED_USER" && task.reviewerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Named-user assignment supports exactly one reviewer.",
        path: ["reviewerCount"],
      });
    }

  });

export const workflowStageSchema = z.object({
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
  documentRequirements: z.array(workflowStageDocumentRequirementSchema)
    .max(100),
  scoring: workflowStageScoringSchema.nullable(),
  commentFields: z.array(workflowStageCommentFieldSchema).max(100),
  initial: z.boolean(),
  slaHours: z.number().int().positive().max(8760).nullable().optional(),
  actions: z.array(workflowActionDefinitionSchema),
  tasks: z.array(workflowTaskSchema),
}).superRefine((stage, context) => {
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
  const documentNames = stage.documentRequirements.map(
    (requirement) => requirement.name.toLowerCase(),
  );
  if (new Set(documentNames).size !== documentNames.length) {
    context.addIssue({
      code: "custom",
      message: "Document requirement names must be unique within the stage.",
      path: ["documentRequirements"],
    });
  }
  const commentKeys = stage.commentFields.map((field) => field.key);
  if (new Set(commentKeys).size !== commentKeys.length) {
    context.addIssue({
      code: "custom",
      message: "Comment and recommendation keys must be unique within the stage.",
      path: ["commentFields"],
    });
  }
  const commentOrders = stage.commentFields.map((field) => field.displayOrder);
  if (new Set(commentOrders).size !== commentOrders.length) {
    context.addIssue({
      code: "custom",
      message: "Comment and recommendation display orders must be unique within the stage.",
      path: ["commentFields"],
    });
  }
  const actionKeys = new Set(stage.actions.map((action) => action.stableKey));
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

export const updateWorkflowDetailsSchema = createWorkflowSchema
  .extend({
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
