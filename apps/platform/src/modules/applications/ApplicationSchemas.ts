import { z } from "zod";

export const createApplicationDraftSchema = z.object({
  businessId: z.uuid().optional(),
  fundingCallIdOrSlug: z.string().trim().min(1).max(160),
}).strict();

export const saveApplicationDraftSchema = z.object({
  expectedApplicationRowVersion: z.number().int().positive(),
  expectedResponseRowVersion: z.number().int().positive(),
  idempotencyKey: z.uuid(),
  values: z.record(z.string(), z.unknown()),
}).strict();

export const applicationListSchema = z.object({
  after: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum([
    "draft",
    "submitted",
    "under-review",
    "completed",
  ]).optional(),
}).strict();

export type CreateApplicationDraftInput = z.infer<
  typeof createApplicationDraftSchema
>;
export type SaveApplicationDraftInput = z.infer<
  typeof saveApplicationDraftSchema
>;
