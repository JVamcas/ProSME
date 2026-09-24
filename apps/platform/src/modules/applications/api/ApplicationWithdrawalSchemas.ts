import { z } from "zod";

export const applicationWithdrawalSchema = z.object({
  confirmed: z.literal(true),
  comment: z.string().trim().min(1).max(4_000).optional(),
  reasonCode: z.string().trim().regex(/^[A-Z][A-Z0-9_]*$/).max(80).optional(),
}).strict();

export type ApplicationWithdrawalInput = z.infer<typeof applicationWithdrawalSchema>;
