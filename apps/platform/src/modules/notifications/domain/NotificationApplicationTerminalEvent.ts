import { z } from "zod";

import {
  applicationOwnerSnapshotSchema,
  identifierSchema,
  timestampSchema,
  uuidSchema,
} from "./NotificationEventSchemaFields";

export const applicationTerminalStatusContextSchema = z.object({
  applicationId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  correlationId: identifierSchema,
  failedRuleIds: z.array(uuidSchema),
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  newStatus: z.string().trim().min(1).max(80),
  occurredAt: timestampSchema,
  owner: applicationOwnerSnapshotSchema,
  previousStatus: z.string().trim().min(1).max(80),
  reasonCodes: z.array(z.string().trim().min(1).max(200)),
  sourceIdempotencyKey: identifierSchema,
  statusLabel: z.string().trim().min(1).max(200),
  workflowInstanceId: uuidSchema,
}).strict();

