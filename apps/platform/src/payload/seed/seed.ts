import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
  type SanitizedConfig,
} from "payload";

import { seedFaqs, seedPages } from "./seed-editorial";
import { seedResources } from "./seed-resources";
import { seedProgrammeContent } from "./seed-programme";
import { seedSiteGlobals } from "./seed-site-globals";
import { seedContext } from "./seed-helpers";

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
  const req = await createLocalReq({ context: seedContext }, payload);
  if (!(await initTransaction(req))) {
    throw new Error("CMS initialization requires a database transaction");
  }

  try {
    await seedSiteGlobals(payload, req);
    // Payload rolls back req on an operation failure. Keep writes ordered so
    // later seeds cannot write outside the rolled-back transaction.
    await seedPages(payload, req);
    await seedFaqs(payload, req);
    await seedProgrammeContent(payload, req);
    await seedResources(payload, req);
    await commitTransaction(req);
  } catch (error) {
    await killTransaction(req);
    throw error;
  }

  payload.logger.info(
    "Baseline CMS initialization completed; existing content preserved",
  );
}
