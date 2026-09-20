import { seedStandardFormDrafts } from "../../apps/platform/src/modules/forms/application/ServerStandardFormSeedService";

const result = await seedStandardFormDrafts();
console.info(
  `Created ${result.createdCodes.length} standard form draft(s): ${result.createdCodes.join(", ") || "none"}`,
);
console.info(
  `Skipped ${result.skippedCodes.length} existing form definition(s): ${result.skippedCodes.join(", ") || "none"}`,
);
process.exit(0);
