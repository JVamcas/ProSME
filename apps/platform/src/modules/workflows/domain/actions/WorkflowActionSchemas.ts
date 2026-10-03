import { z } from "zod";
import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";

const stableKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

const stableKeyListSchema = z.array(stableKeySchema).min(1).max(100);
const uniqueStableKeyListSchema = stableKeyListSchema.refine(
  (values) => new Set(values).size === values.length,
  "Values must be unique.",
);

const fieldPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/);
const uniqueFieldPathListSchema = z
  .array(fieldPathSchema)
  .min(1)
  .max(100)
  .refine(
    (values) => new Set(values).size === values.length,
    "Values must be unique.",
  );

const publicStatusMappingSchema = z
  .object({
    description: z.string().trim().min(2).max(300),
    label: z.string().trim().min(2).max(120),
    status: z.enum(workflowPublicStatuses),
  })
  .strict();

export const approveAdvanceConfigurationSchema = z.object({}).strict();

export const rejectConfigurationSchema = z
  .object({
    outcome: z.discriminatedUnion("type", [
      z
        .object({
          cancelOpenStageInstances: z.literal(true),
          cancelOpenTasks: z.literal(true),
          publicStatusMapping: publicStatusMappingSchema,
          type: z.literal("TERMINAL"),
        })
        .strict(),
      z.object({ type: z.literal("TRANSITION") }).strict(),
    ]),
    reversibleActionKey: stableKeySchema.nullable(),
  })
  .strict();

export const requestInformationConfigurationSchema = z
  .object({
    continuation: z.literal("RESUME_SOURCE_TASK"),
    deadlineDays: z.number().int().positive().max(365),
    editableFieldPaths: uniqueFieldPathListSchema,
    reminderDayOffsets: z.array(z.number().int().positive().max(365)).max(20),
    expiryAction: z.enum(["CLOSE_REQUEST", "ESCALATE", "RETURN"]),
    participantScope: z.literal("APPLICATION_OWNER_AND_REQUESTER"),
    recipientScope: z.literal("APPLICATION_OWNER"),
  })
  .strict()
  .superRefine((configuration, context) => {
    const uniqueOffsets = new Set(configuration.reminderDayOffsets);
    if (uniqueOffsets.size !== configuration.reminderDayOffsets.length) {
      context.addIssue({
        code: "custom",
        message: "Reminder day offsets must be unique.",
        path: ["reminderDayOffsets"],
      });
    }
    if (
      configuration.reminderDayOffsets.some(
        (offset) => offset >= configuration.deadlineDays,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Reminder days must fall before the deadline.",
        path: ["reminderDayOffsets"],
      });
    }
  });

export const returnConfigurationSchema = z
  .object({
    dataHandling: z.enum(["RETAIN", "CLEAR"]),
  })
  .strict();

export const referConfigurationSchema = z
  .object({
    returnToReferrer: z.boolean(),
    sourceTaskBehavior: z.enum(["BLOCKED", "OPEN"]),
  })
  .strict();

export const escalateConfigurationSchema = z
  .object({
    blockUntilResolved: z.boolean(),
    responsibility: z.enum(["RETAIN", "SHARE", "TRANSFER"]),
    targetType: z.enum(["ROLE", "USER"]),
    targetId: z.string().uuid(),
    trigger: z.enum(["MANUAL", "SLA_BREACH", "CONDITION"]),
  })
  .strict();

export const putOnHoldConfigurationSchema = z
  .object({
    reviewDateRequired: z.boolean(),
    scope: z.literal("STAGE"),
  })
  .strict();

export const resumeConfigurationSchema = z
  .object({ scope: z.literal("STAGE") })
  .strict();

export const withdrawConfigurationSchema = z
  .object({
    allowedStageKeys: uniqueStableKeyListSchema,
    resubmissionRule: z.enum([
      "NOT_ALLOWED",
      "NEW_APPLICATION",
      "REOPEN_WITHDRAWN",
    ]),
  })
  .strict();

export const deferConfigurationSchema = z.discriminatedUnion("targetType", [
  z
    .object({
      targetType: z.literal("DATE"),
      targetDate: z.iso.date(),
      continuation: z.literal("RESUME_ON_DATE"),
    })
    .strict(),
  z
    .object({
      targetType: z.literal("FUNDING_CALL"),
      targetCallKey: stableKeySchema,
      continuation: z.literal("EXPLICIT_TRANSFER"),
    })
    .strict(),
]);

const commonShape = {
  condition: conditionGroupSchema.nullable().optional(),
  id: z.string().uuid().optional(),
  stableKey: stableKeySchema,
  label: z.string().trim().min(2).max(160),
  enabled: z.boolean(),
  reasonRequired: z.boolean(),
  displayOrder: z.number().int().positive(),
};

export const workflowActionDefinitionSchema = z.discriminatedUnion(
  "actionType",
  [
    z
      .object({
        ...commonShape,
        actionType: z.literal("APPROVE_ADVANCE"),
        configuration: approveAdvanceConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("REJECT"),
        configuration: rejectConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("REQUEST_INFORMATION"),
        configuration: requestInformationConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("RETURN"),
        configuration: returnConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("REFER"),
        configuration: referConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("ESCALATE"),
        configuration: escalateConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("PUT_ON_HOLD"),
        configuration: putOnHoldConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("RESUME"),
        configuration: resumeConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("WITHDRAW"),
        configuration: withdrawConfigurationSchema,
      })
      .strict(),
    z
      .object({
        ...commonShape,
        actionType: z.literal("DEFER"),
        configuration: deferConfigurationSchema,
      })
      .strict(),
  ],
);
