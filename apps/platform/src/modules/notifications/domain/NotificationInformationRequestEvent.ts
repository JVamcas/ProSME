import { z } from "zod";
import {
  applicationOwnerSnapshotSchema,
  identifierSchema,
  timestampSchema,
  uuidSchema,
} from "./NotificationEventSchemaFields";

const informationRequestContextSchema = z.object({
  applicationId: uuidSchema,
  applicationReference: z.string().trim().min(1).max(100),
  assignees: z.array(applicationOwnerSnapshotSchema),
  correlationId: identifierSchema,
  fundingOpportunityTitle: z.string().trim().min(1).max(300),
  owner: applicationOwnerSnapshotSchema,
  question: z.string().trim().min(1).max(2_000),
  requestInformationId: uuidSchema,
  sourceIdempotencyKey: identifierSchema,
  workflowInstanceId: uuidSchema,
});

export const informationRequestCreatedContextSchema =
  informationRequestContextSchema
    .extend({
      createdAt: timestampSchema,
      deadlineAt: timestampSchema,
    })
    .strict();

export const informationRequestRespondedContextSchema =
  informationRequestContextSchema
    .extend({
      respondedAt: timestampSchema,
    })
    .strict();

export const informationRequestClosedContextSchema =
  informationRequestContextSchema
    .extend({
      closedAt: timestampSchema,
    })
    .strict();

export const informationRequestExpiredContextSchema =
  informationRequestContextSchema
    .extend({
      deadlineAt: timestampSchema,
      expiredAt: timestampSchema,
    })
    .strict();
