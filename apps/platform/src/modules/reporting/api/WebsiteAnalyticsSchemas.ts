import { z } from "zod";

export const websiteAnalyticsQuerySchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    fundingCallId: z.uuid().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const days =
      (Date.parse(value.endDate) - Date.parse(value.startDate)) / 86_400_000;
    if (days < 0 || days > 365) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Choose an ordered date range of at most 366 days.",
      });
    }
  });

export type WebsiteAnalyticsQuery = z.infer<typeof websiteAnalyticsQuerySchema>;
