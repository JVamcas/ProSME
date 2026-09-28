import { z } from "zod";

import { workQueueScopes } from "./WorkQueueTypes";

export const workQueueListSchema = z.object({
  after: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  scope: z.enum(workQueueScopes).default("mine"),
});

export const idempotencyKeySchema = z.uuid();
export const taskInstanceIdSchema = z.uuid();
export const workflowActionKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const saveTaskReviewDraftSchema = z.object({
  items: z.array(z.object({
    accepted: z.boolean(),
    code: z.string().min(1).max(80),
    comment: z.string().trim().max(1000).optional(),
  })).max(30).optional(),
  comments: z.array(z.object({
    key: z.string().min(2).max(80),
    value: z.string().trim().max(4000),
  })).max(100).optional(),
  documents: z.array(z.object({
    category: z.string().trim().min(1).max(160),
    comment: z.string().trim().max(1000).optional(),
    outcome: z.enum(["VERIFIED", "REJECTED", ""]),
  })).max(100).optional(),
  scores: z.array(z.object({
    comment: z.string().trim().max(1000).optional(),
    criterion: z.string().trim().min(1).max(160),
    score: z.number().nullable(),
  })).max(100).optional(),
}).refine(
  (input) => Object.values(input).some((items) => items && items.length > 0),
  { message: "Submit at least one review draft change." },
);

export const completeChecklistTaskSchema = z.object({
  actionKey: workflowActionKeySchema.optional(),
  comments: saveTaskReviewDraftSchema.shape.comments,
  documents: saveTaskReviewDraftSchema.shape.documents,
  expectedRowVersion: z.number().int().positive(),
  items: saveTaskReviewDraftSchema.shape.items.unwrap(),
  scores: saveTaskReviewDraftSchema.shape.scores,
});
