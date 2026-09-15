import { z } from "zod";

import { adminApplicationStatuses } from "./ApplicationTypes";

export const adminApplicationListSchema = z.object({
  after: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  stage: z.string().trim().max(160).optional(),
  status: z.enum(adminApplicationStatuses).default("all"),
});
