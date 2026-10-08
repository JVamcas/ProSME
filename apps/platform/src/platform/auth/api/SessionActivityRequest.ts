import { z } from "zod";

import { sessionIdleMilliseconds } from "../SessionPolicy";

export const sessionActivityRequestSchema = z.object({
  idleForMilliseconds: z.number().int().min(0).max(sessionIdleMilliseconds),
}).strict();
