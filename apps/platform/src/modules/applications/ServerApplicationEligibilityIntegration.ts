import "server-only";

import { readApplicationEligibilityBinding } from "@/db/repositories/ApplicationRepository";

export function resolveApplicationEligibilityRuleSetBinding(
  applicationId: string,
) {
  return readApplicationEligibilityBinding(applicationId);
}
