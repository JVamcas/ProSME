import type { Payload } from "payload";

import { defaultStatistics, defaultSupportGroups, focusSectors } from "../../modules/content/ContentDefaults";
import { findId, seedContext } from "./seed-helpers";

export async function seedProgrammeContent(payload: Payload) {
  await seedStatistics(payload);
  await seedSupportGroups(payload);
  await seedFocusSectors(payload);
}

async function seedStatistics(payload: Payload) {
  for (const [order, item] of defaultStatistics.entries()) {
    const current = await findId(payload, "programme-statistics", "order", order);
    const data = { ...item, order, reviewStatus: "approved" as const, _status: "published" as const };
    if (current) {
      await payload.update({ collection: "programme-statistics", id: current, data, context: seedContext, overrideAccess: true });
    } else {
      await payload.create({ collection: "programme-statistics", data, context: seedContext, overrideAccess: true });
    }
  }
}

async function seedSupportGroups(payload: Payload) {
  for (const [order, item] of defaultSupportGroups.entries()) {
    const current = await findId(payload, "eligibility-content", "label", item.label);
    const data = { ...item, kind: "criterion" as const, order, reviewStatus: "approved" as const, _status: "published" as const };
    if (current) {
      await payload.update({ collection: "eligibility-content", id: current, data, context: seedContext, overrideAccess: true });
    } else {
      await payload.create({ collection: "eligibility-content", data, context: seedContext, overrideAccess: true });
    }
  }
}

async function seedFocusSectors(payload: Payload) {
  for (const [order, label] of focusSectors.entries()) {
    const current = await findId(payload, "eligibility-content", "label", label);
    const data = { description: "Priority area", kind: "focusSector" as const, label, order, reviewStatus: "approved" as const, _status: "published" as const };
    if (current) {
      await payload.update({ collection: "eligibility-content", id: current, data, context: seedContext, overrideAccess: true });
    } else {
      await payload.create({ collection: "eligibility-content", data, context: seedContext, overrideAccess: true });
    }
  }
}
