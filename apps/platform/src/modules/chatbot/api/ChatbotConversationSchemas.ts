import { z } from "zod";
import { chatbotLimits } from "../domain/ChatbotLimits";
import { chatbotNoticeVersion } from "../domain/ChatbotAnswer";

export const chatbotSessionSchema = z
  .object({
    noticeVersion: z.literal(chatbotNoticeVersion),
    consent: z.literal(true),
  })
  .strict();
export const chatbotTurnSchema = z
  .object({
    turnId: z.uuid(),
    question: z.string().trim().min(1).max(chatbotLimits.questionCharacters),
    fundingCallId: z.uuid().nullable().optional(),
  })
  .strict();
export const chatbotContactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(320),
    consent: z.literal(true),
  })
  .strict();
export const chatbotCaseUpdateSchema = z
  .object({
    expectedRowVersion: z.number().int().positive(),
    state: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]),
    resolutionNote: z.string().trim().max(2000).default(""),
  })
  .strict()
  .refine(
    (value) => value.state !== "RESOLVED" || Boolean(value.resolutionNote),
    { path: ["resolutionNote"], message: "A resolution note is required." },
  );
export const chatbotCaseAssignmentSchema = z
  .object({
    expectedRowVersion: z.number().int().positive(),
    assignedTo: z.uuid().nullable(),
  })
  .strict();
export const chatbotCaseQuerySchema = z
  .object({
    scope: z.enum(["assigned", "all"]).optional(),
    after: z.iso.datetime().optional(),
    afterId: z.uuid().optional(),
    state: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.after) === Boolean(value.afterId), {
    message: "Both cursor fields are required.",
  });
