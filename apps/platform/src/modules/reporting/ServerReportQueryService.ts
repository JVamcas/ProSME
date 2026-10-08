import "server-only";

import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { reportQuerySchema, type ReportQueryInput } from "./api/ReportQuerySchemas";
import { bindReportParameters } from "./domain/ReportParameters";
import { ReportQueryValidationError } from "./domain/ReportQueryLimits";
import { findReportDataset } from "./infrastructure/ReportDatasetRepository";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import { validateReportSql } from "./infrastructure/ReportSqlPolicy";
import {
  executeReportQuery,
  validateReportOutputContract,
  type ReportBatchConsumer,
  type ReportQueryScope,
} from "./infrastructure/ReportQueryRepository";

async function prepareQuery(user: AuthenticatedUser | null, values: ReportQueryInput) {
  const actor = requirePermission(user, permissionCodes.reportingQueryExecuteAll);
  requirePermission(actor, permissionCodes.reportingDatasetReadAll);
  const input = reportQuerySchema.parse(values);
  const dataset = await findReportDataset(input.datasetKey, input.datasetVersion);
  if (!dataset) {
    throw new ReportQueryValidationError("The selected dataset version is unavailable.");
  }
  for (const permission of dataset.definition.sourcePermissions) {
    requirePermission(actor, permission);
  }
  const configuration = googleAnalyticsConfiguration();
  const runAt = new Date().toISOString();
  const scope: ReportQueryScope = {
    actorId: actor.id,
    datasetKey: dataset.key,
    runAt,
    timezone: configuration?.timezone ?? "Africa/Windhoek",
  };
  if (dataset.key === "website-analytics") {
    if (!configuration || !input.websitePeriod) {
      throw new ReportQueryValidationError(
        "Website reporting requires the configured property and an exact source period.",
      );
    }
    Object.assign(scope, configuration, input.websitePeriod);
  } else if (input.websitePeriod) {
    throw new ReportQueryValidationError(
      "Website source context cannot be applied to another dataset.",
    );
  }
  const parameters = bindReportParameters({
    definitions: input.parameters,
    values: input.values,
    runAt,
    timezone: scope.timezone,
  });
  return { input, dataset, parameters, scope };
}

// Publication and execution share the same parser, parameter and output contract.
export async function validateReportQuery(
  user: AuthenticatedUser | null,
  values: ReportQueryInput,
) {
  const prepared = await prepareQuery(user, values);
  const projection = await validateReportSql(
    prepared.input.sql,
    prepared.dataset,
    prepared.parameters.length,
  );
  if (
    projection.length !== prepared.input.columns.length ||
    projection.some((name, index) => name !== prepared.input.columns[index].name)
  ) {
    throw new ReportQueryValidationError("Declared output columns must match the SQL projection.");
  }
  await validateReportOutputContract({
    dataset: prepared.dataset,
    sql: prepared.input.sql,
    values: prepared.parameters,
    columns: prepared.input.columns,
    scope: prepared.scope,
    onBatch: async () => undefined,
  });
  return {
    datasetKey: prepared.dataset.key,
    datasetVersion: prepared.dataset.version,
    columns: prepared.input.columns,
  };
}

export async function streamReportQuery(
  user: AuthenticatedUser | null,
  values: ReportQueryInput,
  onBatch: ReportBatchConsumer,
) {
  const prepared = await prepareQuery(user, values);
  return executeReportQuery({
    dataset: prepared.dataset,
    sql: prepared.input.sql,
    values: prepared.parameters,
    columns: prepared.input.columns,
    scope: prepared.scope,
    onBatch,
  });
}
