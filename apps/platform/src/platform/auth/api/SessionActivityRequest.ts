import { z } from "zod";

import { sessionIdleMilliseconds } from "../SessionPolicy";

export const sessionActivityRequestSchema = z.object({
  idleForMilliseconds: z.number().int().min(0).max(sessionIdleMilliseconds),
}).strict();

export function isSameOriginSessionActivityRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    request.headers.get("x-session-activity") !== "1" ||
    (fetchSite !== null && fetchSite !== "same-origin")
  ) {
    return false;
  }

  const requestUrl = new URL(request.url);
  // Next.js standalone uses the container's bind address in request.url.
  // Host preserves the browser-facing authority. Our TLS proxy overwrites
  // X-Forwarded-Proto with the original protocol; direct Next.js requests
  // receive that header from the server too.
  const host = request.headers.get("host") ?? requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto")
    ?? requestUrl.protocol.slice(0, -1);
  if (protocol !== "http" && protocol !== "https") {
    return false;
  }

  try {
    const expectedUrl = new URL(`${protocol}://${host}`);
    if (
      expectedUrl.username ||
      expectedUrl.password ||
      expectedUrl.pathname !== "/" ||
      expectedUrl.search ||
      expectedUrl.hash
    ) {
      return false;
    }
    return request.headers.get("origin") === expectedUrl.origin;
  } catch {
    return false;
  }
}
