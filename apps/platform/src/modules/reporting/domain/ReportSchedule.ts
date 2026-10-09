import { z } from "zod";

export const reportScheduleInputSchema = z
  .object({
    anchor: z.iso.date(),
    frequencyDays: z.number().int().min(1).max(366),
    timezone: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid IANA timezone."),
    sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    enabled: z.boolean(),
    rowVersion: z.number().int().positive().optional(),
  })
  .strict();
export type ReportScheduleInput = z.infer<typeof reportScheduleInputSchema>;
export type ReportSchedule = ReportScheduleInput & {
  id: string;
  reportId: string;
  rowVersion: number;
  cursor: string;
  nextDueAt: string;
  pendingRunId: string | null;
  error: string | null;
  leaseToken: string | null;
};
export type ReportPeriod = {
  startDate: string;
  endDate: string;
  nextCursor: string;
  startAt: string;
  endAt: string;
  dueAt: string;
};
