import { createHash } from "node:crypto";
import type { PublicEligibilityQuestion } from "../api/PublicEligibilitySelfCheckTransport";

export function questionId(versionId: string, path: string) {
  return createHash("sha256")
    .update(`${versionId}:${path}`)
    .digest("hex")
    .slice(0, 32);
}

export function configurationToken(
  versionId: string,
  questions: PublicEligibilityQuestion[],
) {
  return createHash("sha256")
    .update(JSON.stringify({ questions, versionId }))
    .digest("hex");
}
