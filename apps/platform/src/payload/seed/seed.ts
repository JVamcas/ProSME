import { getPayload, type SanitizedConfig } from "payload";

import { seedFaqs, seedPages } from "./seed-editorial";
import { seedResourceAndCall } from "./seed-opportunities";
import { seedProgrammeContent } from "./seed-programme";
import { seedSiteGlobals } from "./seed-site-globals";

export async function script(config: SanitizedConfig) {
  try {
    await seedDatabase(config);
  } catch (error) {
    process.exitCode = 1;
    throw error;
  }
}

async function seedDatabase(config: SanitizedConfig) {
  const payload = await getPayload({ config });

  await seedSiteGlobals(payload);
  await Promise.all([
    seedPages(payload),
    seedFaqs(payload),
    seedProgrammeContent(payload),
    seedResourceAndCall(payload),
  ]);

  payload.logger.info("Baseline application content seeded successfully");
}
