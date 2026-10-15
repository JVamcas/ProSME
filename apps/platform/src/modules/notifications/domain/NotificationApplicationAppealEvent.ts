import { z } from "zod";

export const applicationAppealEventSchema = z
  .object({
    appealId: z.uuid(),
    appealReference: z.string().regex(/^APL-\d{6,}$/),
    applicationId: z.uuid(),
    applicationReference: z.string().min(1).max(100),
    occurredAt: z.iso.datetime(),
  })
  .strict();
export type ApplicationAppealEvent = z.infer<
  typeof applicationAppealEventSchema
>;
export const applicationAppealFields = [
  "platformName",
  "recipientName",
  "brandingLogoUrl",
  "appealReference",
  "applicationReference",
  "appealUrl",
  "contactUrl",
] as const;
export const applicationAppealEventSeeds = [
  {
    catalogKey: "APPLICATIONS",
    key: "application.appeal.received",
    description:
      "A public application appeal has been received and needs staff review.",
    displayName: "New Application Appeal Received",
    id: "00000000-0000-4000-8000-000000000240",
    ruleId: "00000000-0000-4000-8000-000000000340",
    ruleRecipientId: "00000000-0000-4000-8000-000000000740",
    ruleChannelId: "00000000-0000-4000-8000-000000000640",
  },
  {
    catalogKey: "APPLICATIONS",
    key: "application.appeal.acknowledged",
    description: "Acknowledge an accepted appeal to the public submitter.",
    displayName: "Application appeal acknowledgement",
    id: "00000000-0000-4000-8000-000000000241",
    ruleId: "00000000-0000-4000-8000-000000000341",
    ruleRecipientId: "00000000-0000-4000-8000-000000000741",
    ruleChannelId: "00000000-0000-4000-8000-000000000641",
  },
] as const;
export const applicationAppealTemplateSeeds = [
  {
    eventKey: "application.appeal.received",
    scope: "EVENT",
    id: "00000000-0000-4000-8000-000000000540",
    defaultSubjectTemplate:
      "New application appeal {{appealReference}} received",
  },
  {
    eventKey: "application.appeal.acknowledged",
    scope: "EVENT",
    id: "00000000-0000-4000-8000-000000000541",
    defaultSubjectTemplate: "Appeal received: {{appealReference}}",
  },
] as const;

export const applicationAppealEventCatalogue = {
  "application.appeal.received": {
    catalogKey: "APPLICATIONS",
    ruleEligibility: "CONFIGURABLE",
    contextSchema: applicationAppealEventSchema,
    key: "application.appeal.received",
  },
  "application.appeal.acknowledged": {
    catalogKey: "APPLICATIONS",
    ruleEligibility: "SYSTEM_ONLY",
    contextSchema: applicationAppealEventSchema,
    key: "application.appeal.acknowledged",
  },
} as const;
