import { z } from "zod";

export const chatbotSettingsUpdateSchema = z
  .object({
    publicEnabled: z.boolean(),
    modelEnabled: z.boolean(),
    expectedRowVersion: z.number().int().min(1),
  })
  .strict();

export type ChatbotSettingsUpdate = z.infer<typeof chatbotSettingsUpdateSchema>;
