import { z } from "zod";
import {
  identifierSchema,
  uuidSchema,
  timestampSchema,
} from "./NotificationEventSchemaFields";
export const fundingCallLifecycleContextSchema = z
  .object({
    correlationId: identifierSchema,
    excludedRecipientUserIds: z.array(uuidSchema),
    fundingCallId: uuidSchema,
    fundingCallReference: z.string().trim().min(1).max(100),
    fundingCallTitle: z.string().trim().min(1).max(300),
    occurredAt: timestampSchema,
    reason: z.string().trim().min(1).max(1_000).nullable(),
    sourceIdempotencyKey: identifierSchema,
    sourceStatus: z.string().trim().min(1).max(50),
    targetStatus: z.string().trim().min(1).max(50),
  })
  .strict();
