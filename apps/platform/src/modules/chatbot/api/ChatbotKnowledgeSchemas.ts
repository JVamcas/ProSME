import { z } from "zod";
import { chatbotLimits, chatbotPolicyDefaults } from "../domain/ChatbotLimits";

const unique = (values: string[]) => new Set(values).size === values.length;
const faqId = z
  .string()
  .regex(/^[1-9][0-9]*$/)
  .max(10)
  .refine((value) => Number(value) <= 2147483647, "Invalid FAQ identifier.");

export const knowledgeSelectionSchema = z
  .object({
    fundingCallIds: z
      .array(z.uuid())
      .max(chatbotLimits.selectedCalls)
      .refine(unique),
    faqIds: z.array(faqId).max(chatbotLimits.selectedFaqs).refine(unique),
  })
  .strict()
  .refine((value) => value.fundingCallIds.length + value.faqIds.length > 0, {
    message: "Select at least one published source.",
    path: ["fundingCallIds"],
  });

export const knowledgeApprovalSchema = z
  .object({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export const knowledgeSourceQuerySchema = z
  .object({
    kind: z.enum(["funding-call", "faq"]),
    after: z.string().max(100).optional(),
    search: z.string().trim().max(200).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.after) return;
    const schema = value.kind === "faq" ? faqId : z.uuid();
    if (!schema.safeParse(value.after).success) {
      context.addIssue({
        code: "custom",
        path: ["after"],
        message: "Invalid source cursor.",
      });
    }
  });

export const chatbotPolicySchema = z
  .object({
    sessionMinutes: z
      .number()
      .int()
      .min(5)
      .max(120)
      .default(chatbotPolicyDefaults.sessionMinutes),
    escalationDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(chatbotPolicyDefaults.escalationDays),
    contactDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(chatbotPolicyDefaults.contactDays),
    recipientUserIds: z.array(z.uuid()).max(50).refine(unique).default([]),
    unresolvedPolicy: z
      .literal("UPDATE_OPEN_CASE")
      .default(chatbotPolicyDefaults.unresolvedPolicy),
  })
  .strict();

export type KnowledgeSourceQuery = z.infer<typeof knowledgeSourceQuerySchema>;
export type ChatbotPolicy = z.infer<typeof chatbotPolicySchema>;
