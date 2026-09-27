import { z } from "zod";

export const applicationWithdrawalSchema = z.object({
  confirmed: z.literal(true),
  reason: z.string().trim().min(1, "Provide a reason for withdrawal.").max(4_000),
}).strict();

export type ApplicationWithdrawalInput = z.infer<typeof applicationWithdrawalSchema>;
