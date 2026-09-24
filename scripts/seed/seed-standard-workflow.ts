import { seedStandardWorkflowDraft } from "../../apps/platform/src/modules/workflows/application/standard/ServerStandardWorkflowSeedService";

const result = await seedStandardWorkflowDraft();
console.info(
  result.created
    ? `Created standard workflow draft ${result.definitionId}.`
    : `Skipped existing standard workflow ${result.definitionId}.`,
);
console.info(
  `Task form bindings added: ${result.bindingsAdded}.`,
);
console.info(
  `Bound published forms: ${result.boundPublishedFormCodes.join(", ") || "none"}.`,
);
console.info(
  `Bound draft forms awaiting publication: ${result.boundDraftFormCodes.join(", ") || "none"}.`,
);
console.info(
  `Forms not found: ${result.unresolvedFormCodes.join(", ") || "none"}.`,
);
process.exit(0);
