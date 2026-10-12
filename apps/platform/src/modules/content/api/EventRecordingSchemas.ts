import { z } from "zod";
export const eventRecordingSearchSchema = z.object({
  search: z.string().trim().max(200),
  category: z.string().trim().max(200),
});
