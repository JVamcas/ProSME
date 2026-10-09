import "server-only";

import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  reportDatasetDefinitionSchema,
  type ReportDataset,
  type ReportDatasetKey,
} from "../domain/ReportDataset";

import { reportDescriptionSchema } from "../domain/ReportDescription";

function parseDataset(row: ReportDataset): ReportDataset {
  return {
    ...row,
    description: reportDescriptionSchema.parse(row.description),
    definition: reportDatasetDefinitionSchema.parse(row.definition),
  };
}

export async function listReportDatasets() {
  const result = await getDatabase().execute<ReportDataset>(sql`
    SELECT key, version, name, description, definition FROM app_reporting_datasets
    ORDER BY name, version DESC LIMIT 100
  `);
  return result.rows.map(parseDataset);
}

export async function findReportDataset(
  key: ReportDatasetKey,
  version: number,
) {
  const result = await getDatabase().execute<ReportDataset>(sql`
    SELECT key, version, name, description, definition FROM app_reporting_datasets
    WHERE key = ${key} AND version = ${version}
  `);
  return result.rows[0] ? parseDataset(result.rows[0]) : null;
}
