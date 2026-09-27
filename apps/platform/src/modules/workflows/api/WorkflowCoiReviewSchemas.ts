import { z } from "zod";

export const workflowCoiReviewListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
});

export const workflowCoiReviewDecisionSchema = z
  .object({
    decision: z.enum(["CLEAR", "RECUSE"]),
    expectedRowVersion: z.number().int().positive(),
    reason: z.string().trim().min(10).max(1000),
    replacementUserId: z.uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "RECUSE" && !value.replacementUserId) {
      context.addIssue({
        code: "custom",
        message: "Select a replacement reviewer.",
        path: ["replacementUserId"],
      });
    }
  });
