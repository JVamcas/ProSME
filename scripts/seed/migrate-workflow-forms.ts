import { migrateWorkflowForms } from "../../apps/platform/src/modules/workflows/application/definitions/ServerWorkflowFormMigrationService";

const apply = process.env.APPLY_WORKFLOW_FORM_MIGRATION === "true";
const results = await migrateWorkflowForms(!apply);
console.info(JSON.stringify({ applied: apply, results }, null, 2));
process.exit(0);
