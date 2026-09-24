import "server-only";

import { readApplicationEligibilityBinding } from "@/modules/applications/infrastructure/ApplicationRepository";

export function resolveApplicationEligibilityRuleSetBinding(
  applicationId: string,
) {
  return readApplicationEligibilityBinding(applicationId);
}
