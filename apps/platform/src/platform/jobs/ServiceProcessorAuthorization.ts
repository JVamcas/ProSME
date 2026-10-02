import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isAuthorizedServiceProcessorRequest(
  authorizationHeader: string | null,
  expectedSecret: string,
) {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorizationHeader.slice("Bearer ".length));
  const expected = Buffer.from(expectedSecret);
  return expected.length >= 32
    && supplied.length === expected.length
    && timingSafeEqual(supplied, expected);
}
