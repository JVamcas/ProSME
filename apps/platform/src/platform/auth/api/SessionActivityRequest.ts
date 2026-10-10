import { z } from "zod";
import { isSameOriginRequest } from "@/shared/utils/requestOrigin";

import { sessionIdleMilliseconds } from "../SessionPolicy";

export const sessionActivityRequestSchema = z
  .object({
    idleForMilliseconds: z.number().int().min(0).max(sessionIdleMilliseconds),
  })
  .strict();

export function isSameOriginSessionActivityRequest(request: Request) {
  return (
    request.headers.get("x-session-activity") === "1" &&
    isSameOriginRequest(request.headers, request.url)
  );
}
