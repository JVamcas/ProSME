import { z } from "zod";
import {
  uuidSchema,
  identifierSchema,
  snapshotNameSchema,
  snapshotEmailSchema,
  timestampSchema,
} from "./NotificationEventSchemaFields";

export const applicationSubmittedContextSchema = z
  .object({
    applicationId: uuidSchema,
    applicationOwnerUserId: uuidSchema,
    applicationReference: z.string().trim().min(1).max(100),
    correlationId: identifierSchema,
    fundingOpportunityTitle: z.string().trim().min(1).max(300),
    ownerDisplayName: snapshotNameSchema,
    ownerEmail: snapshotEmailSchema,
    sourceIdempotencyKey: identifierSchema,
    submittedAt: timestampSchema,
    workflowInstanceId: uuidSchema,
  })
  .strict();
