import "server-only";

import {
  listWorkflowFormMigrationSources,
  migrateWorkflowFormVersion,
} from "../../infrastructure/WorkflowFormMigrationRepository";

// Administrative migration entrypoint, invoked by the database operator CLI only.
export async function migrateWorkflowForms(dryRun = true) {
  const sources = await listWorkflowFormMigrationSources();
  const results = [];
  // Serialize transactions: several source drafts can share one workflow definition.
  for (const source of sources)
    results.push(await migrateWorkflowFormVersion(source.id, dryRun));
  return results;
}
