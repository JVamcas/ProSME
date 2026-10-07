import type { Payload, PayloadRequest } from "payload";

import {
  defaultStatistics,
  defaultSupportGroups,
  focusSectors,
} from "../../modules/content/ContentDefaults";
import { hasCollectionSeedHistory } from "@/modules/content/infrastructure/CmsSeedStateRepository";
import { seedContext } from "./seed-helpers";

export async function seedProgrammeContent(payload: Payload, req?: PayloadRequest) {
  const [statisticsExist, eligibilityExists] = await Promise.all([
    hasCollectionSeedHistory(payload, "programme-statistics", req),
    hasCollectionSeedHistory(payload, "eligibility-content", req),
  ]);

  // A failed Payload write rolls back the shared transaction immediately.
  if (!statisticsExist) await seedStatistics(payload, req);
  if (!eligibilityExists) await seedEligibilityContent(payload, req);
}

async function seedEligibilityContent(payload: Payload, req?: PayloadRequest) {
  // Both kinds share one collection; initialize them together after one check.
  await seedSupportGroups(payload, req);
  await seedFocusSectors(payload, req);
}

async function seedStatistics(payload: Payload, req?: PayloadRequest) {
  for (const [order, item] of defaultStatistics.entries()) {
    await payload.create({
      collection: "programme-statistics",
      data: {
        ...item,
        order,
        reviewStatus: "approved",
        _status: "published",
      },
      context: seedContext,
      req,
      overrideAccess: true,
    });
  }
}

async function seedSupportGroups(payload: Payload, req?: PayloadRequest) {
  for (const [order, item] of defaultSupportGroups.entries()) {
    await payload.create({
      collection: "eligibility-content",
      data: {
        ...item,
        kind: "criterion",
        order,
        reviewStatus: "approved",
        _status: "published",
      },
      context: seedContext,
      req,
      overrideAccess: true,
    });
  }
}

async function seedFocusSectors(payload: Payload, req?: PayloadRequest) {
  for (const [order, label] of focusSectors.entries()) {
    await payload.create({
      collection: "eligibility-content",
      data: {
        description: "Priority area",
        kind: "focusSector",
        label,
        order,
        reviewStatus: "approved",
        _status: "published",
      },
      context: seedContext,
      req,
      overrideAccess: true,
    });
  }
}
