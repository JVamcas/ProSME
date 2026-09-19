import { z } from "zod";

const workflowTemplateCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/, {
    message: "Use uppercase letters, numbers, and underscores.",
  });

export const workflowTemplateDetailsSchema = z.object({
  code: workflowTemplateCodeSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
});

export const workflowTemplateVersionReferenceSchema = z.object({
  templateId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const workflowTemplateUpdateSchema =
  workflowTemplateVersionReferenceSchema
    .extend(workflowTemplateDetailsSchema.shape)
    .extend({ expectedRowVersion: z.number().int().positive() });

export const workflowTemplateLifecycleSchema =
  workflowTemplateVersionReferenceSchema
    .extend({
      expectedRowVersion: z.number().int().positive(),
      idempotencyKey: z.string().trim().min(1).max(200),
    })
    .and(
      z.discriminatedUnion("command", [
        z.object({ command: z.literal("SUBMIT") }),
        z.object({
          command: z.literal("RETURN"),
          reason: z.string().trim().min(1).max(1000),
        }),
        z.object({ command: z.literal("APPROVE") }),
        z.object({ command: z.literal("PUBLISH") }),
        z.object({ command: z.literal("RETIRE") }),
      ]),
    );

export type WorkflowTemplateLifecycleInput = z.infer<
  typeof workflowTemplateLifecycleSchema
>;
export type CreateWorkflowTemplateInput = z.infer<
  typeof workflowTemplateDetailsSchema
>;
export type WorkflowTemplateUpdateInput = z.infer<
  typeof workflowTemplateUpdateSchema
>;
