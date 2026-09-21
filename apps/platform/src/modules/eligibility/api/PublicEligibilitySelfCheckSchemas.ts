import { z } from "zod";

export const publicEligibilitySelfCheckInputSchema = z
  .object({
    answers: z.record(
      z.string().regex(/^[a-f0-9]{32}$/),
      z.union([
        z.boolean(),
        z.number().finite(),
        z.string().trim().min(1).max(500),
      ]),
    ),
    configurationToken: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
