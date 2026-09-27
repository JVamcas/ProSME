import { z } from "zod";

import { staticPermissionCodes } from "@/auth/authorization/permissions";
import { conditionFieldTypes } from "@/modules/conditions/domain/ConditionConfiguration";
import { workflowElementVisibilities } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  workflowTaskAssignmentModes,
  workflowTaskTypes,
} from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";

const taskCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const workflowTaskSchema = z
  .object({
    actionKeys: z
      .array(taskCodeSchema)
      .max(100)
      .refine(
        (values) => new Set(values).size === values.length,
        "Task action bindings must be unique.",
      ),
    permissions: z
      .object({
        view: z.enum(staticPermissionCodes),
        edit: z.enum(staticPermissionCodes),
        decide: z.enum(staticPermissionCodes),
        visibility: z.enum(workflowElementVisibilities),
      })
      .strict(),
    id: z.string().uuid().optional(),
    stableKey: taskCodeSchema,
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000),
    roleId: z.string().uuid().nullable().optional(),
    namedUserOverrideId: z.string().uuid().nullable().optional(),
    assignmentMode: z.enum(workflowTaskAssignmentModes),
    taskType: z.enum(workflowTaskTypes),
    reviewerCount: z.number().int().positive().max(100),
    reviewRelease: z
      .enum(["STAGE_COMPLETED", "THRESHOLD_MET", "IMMEDIATE"])
      .optional(),
    submittedReplacementPolicy: z.enum(["DENY", "REOPEN_SLOT"]).optional(),
    requiredCompletionCount: z.number().int().positive().max(100),
    completionMode: z.enum(["ALL", "COUNT", "PERCENT"]).optional(),
    completionPercentage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
    quorum: z.boolean(),
    quorumRule: z
      .object({
        population: z.enum(["ASSIGNED_TASKS", "REGISTERED"]),
        minimumCount: z.number().int().positive().nullable(),
        minimumPercentage: z.number().int().min(1).max(100).nullable(),
        rounding: z.literal("CEIL"),
        chairRequired: z.boolean(),
        recusalDenominator: z.enum(["EXCLUDE", "INCLUDE"]),
        freeze: z.enum(["AT_DECISION", "ON_FIRST_PASS"]),
        abstentionsCountAsPresent: z.boolean(),
      })
      .strict()
      .nullable()
      .optional(),
    coiRequired: z.boolean(),
    displayOrder: z.number().int().positive(),
    required: z.boolean(),
    config: z.unknown(),
    formBinding: z
      .object({
        contextFields: z
          .array(
            z
              .object({
                key: z
                  .string()
                  .regex(
                    /^(application|fundingCall|workflow|stage|task)\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
                    "Use an application, fundingCall, workflow, stage or task context path.",
                  ),
                label: z.string().trim().min(2).max(160),
                type: z.enum(conditionFieldTypes),
              })
              .strict(),
          )
          .max(200)
          .refine(
            (fields) =>
              new Set(fields.map((field) => field.key)).size === fields.length,
            "Selected context fields must be unique.",
          ),
        formVersionId: z.string().uuid(),
      })
      .strict()
      .nullable(),
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
    if (
      task.quorum &&
      (!task.quorumRule ||
        (task.quorumRule.minimumCount === null &&
          task.quorumRule.minimumPercentage === null))
    ) {
      context.addIssue({
        code: "custom",
        message: "Quorum requires an independent participation rule.",
        path: ["quorumRule"],
      });
    }
    if (
      task.quorum &&
      task.quorumRule?.population === "ASSIGNED_TASKS" &&
      task.quorumRule.minimumCount !== null &&
      task.quorumRule.minimumCount > task.reviewerCount
    ) {
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
    if (task.taskType === "STAGE_DECISION" && task.reviewerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "A stage-decision task must have exactly one assignee.",
        path: ["reviewerCount"],
      });
    }
  });
