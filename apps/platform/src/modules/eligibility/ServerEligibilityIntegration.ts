import "server-only";

import { createHash } from "node:crypto";
import { getPayload } from "payload";
import configPromise from "@payload-config";

import type { EligibilityRuleSnapshot } from "./EligibilityTypes";

export async function loadPublishedEligibilityRuleSet() {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "eligibility-content",
    depth: 0,
    draft: false,
    limit: 100,
    overrideAccess: true,
    sort: ["order", "id"],
    where: {
      and: [
        { _status: { equals: "published" } },
        { kind: { equals: "checkerQuestion" } },
      ],
    },
  });
  const rules: EligibilityRuleSnapshot[] = result.docs
    .filter((item) => Boolean(item.key))
    .map((item) => ({
      hardStop: item.hardStop ?? false,
      help: item.description,
      id: item.key!,
      question: item.label,
    }));
  const version = createHash("sha256")
    .update(JSON.stringify(rules))
    .digest("hex");

  return { rules, version };
}

