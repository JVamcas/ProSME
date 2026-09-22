import { z } from "zod";

export const publicEligibilitySelfCheckInputSchema = z
  .object({
    answers: z.record(
      z.string().regex(/^[a-f0-9]{32}$/),
      z.union([
        z.boolean(),
        z.number().finite(),
        z.string().trim().min(1).max(500),
        z.array(z.string().trim().min(1).max(100)).min(1).max(100),
      ]),
    ),
    configurationToken: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
