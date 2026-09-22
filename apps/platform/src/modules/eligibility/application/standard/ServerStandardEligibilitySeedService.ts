import "server-only";

import { insertStandardEligibilityBaseline } from "../../infrastructure/StandardEligibilitySeedRepository";

export type StandardEligibilitySeedInput = {
  approvedAt: Date;
  approvedBy: string;
  fundingCallReferences?: readonly string[];
};

export function seedStandardEligibilityBaseline(
  input: StandardEligibilitySeedInput,
) {
  return insertStandardEligibilityBaseline({
    approvedAt: input.approvedAt,
    approvedBy: input.approvedBy.trim(),
    fundingCallReferences: input.fundingCallReferences ?? [],
  });
}
