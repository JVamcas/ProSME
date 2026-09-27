import { z } from "zod";

const uniqueUuidList = z.array(z.uuid()).max(100).refine(
  (values) => new Set(values).size === values.length,
  "Values must be unique.",
);

export const respondToWorkflowRfiSchema = z.object({
  correlationId: z.uuid(),
  evidenceVersionIds: uniqueUuidList,
  expectedRowVersion: z.number().int().positive(),
  fieldValues: z.record(z.string(), z.unknown()),
  idempotencyKey: z.uuid(),
  requestInformationId: z.uuid(),
}).strict();

export const closeWorkflowRfiSchema = z.object({
  correlationId: z.uuid(),
  expectedRowVersion: z.number().int().positive(),
  requestInformationId: z.uuid(),
}).strict();

export const saveWorkflowRfiDraftSchema = z.object({
  expectedRowVersion: z.number().int().nonnegative(),
  fieldValues: z.record(z.string(), z.unknown()),
  requestInformationId: z.uuid(),
}).strict();

export const addWorkflowRfiFollowUpSchema = z.object({
  correlationId: z.uuid(),
  message: z.string().trim().min(1).max(4_000),
  requestInformationId: z.uuid(),
}).strict();

export type RespondToWorkflowRfiInput = z.infer<
  typeof respondToWorkflowRfiSchema
>;
export type CloseWorkflowRfiInput = z.infer<typeof closeWorkflowRfiSchema>;
export type SaveWorkflowRfiDraftInput = z.infer<
  typeof saveWorkflowRfiDraftSchema
>;
export type AddWorkflowRfiFollowUpInput = z.infer<
  typeof addWorkflowRfiFollowUpSchema
>;
