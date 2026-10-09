import { bootstrapReports } from "../../apps/platform/src/modules/reporting/ServerReportBootstrapService";
import { findReportingPrincipal } from "../../apps/platform/src/modules/reporting/infrastructure/ReportPrincipalRepository";
import { reportingIdSchema } from "../../apps/platform/src/modules/reporting/api/ReportManagementSchemas";

const actorId = reportingIdSchema.parse(
  process.env.REPORTING_BOOTSTRAP_ACTOR_ID,
);
const actor = await findReportingPrincipal(actorId);
const result = await bootstrapReports(actor);
console.info("Explicit reporting bootstrap finished", result);
