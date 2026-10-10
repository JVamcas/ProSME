import { z } from "zod";
export const chatbotCaseEventSchema = z
  .object({
    caseId: z.uuid(),
    caseReference: z
      .string()
      .regex(/^SUP-\d{6,}$/)
      .optional(),
    occurredAt: z.iso.datetime(),
    recipientUserIds: z.array(z.uuid()).max(50),
  })
  .strict();
export type ChatbotCaseEvent = z.infer<typeof chatbotCaseEventSchema>;
export const chatbotNotificationFields = [
  "platformName",
  "recipientName",
  "brandingLogoUrl",
  "caseReference",
  "caseUrl",
] as const;
export const chatbotCaseEventSeed = {
  catalogKey: "CHATBOT",
  key: "chatbot.case.created",
  description: "A protected support case needs staff review.",
  displayName: "Chatbot support case created",
  id: "00000000-0000-4000-8000-000000000234",
  ruleId: "00000000-0000-4000-8000-000000000334",
  ruleRecipientId: "00000000-0000-4000-8000-000000000734",
  ruleChannelId: "00000000-0000-4000-8000-000000000634",
} as const;
export const chatbotCaseTemplateSeed = {
  eventKey: "chatbot.case.created",
  scope: "EVENT",
  id: "00000000-0000-4000-8000-000000000534",
  defaultSubjectTemplate:
    "Visitor enquiry {{caseReference}} needs your attention",
} as const;
