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

export const completeChecklistTaskSchema = z.object({
  actionKey: workflowActionKeySchema.optional(),
  expectedRowVersion: z.number().int().positive(),
  items: z.array(z.object({
    accepted: z.boolean(),
    code: z.string().min(1).max(80),
    comment: z.string().trim().max(1000).optional(),
  })).max(30),
  comments: z.array(z.object({
    key: z.string().min(2).max(80),
    value: z.string().trim().max(4000),
  })).max(100).optional(),
});
