import { z } from "zod";
import { reportQuerySchema } from "../api/ReportQuerySchemas";

export const reportFormatSchema = z.enum(["XLSX", "CSV"]);
export const reportTemplateDefinitionSchema = reportQuerySchema
  .omit({
    values: true,
    websitePeriod: true,
  })
  .extend({
    formats: z.array(reportFormatSchema).min(1).max(2),
  });
export type ReportTemplateDefinition = z.infer<
  typeof reportTemplateDefinitionSchema
>;
export type ReportFormat = z.infer<typeof reportFormatSchema>;
export type ReportTemplate = {
  id: string;
  key: string;
  name: string;
  description: string;
  rowVersion: number;
  publishedVersion: number | null;
  definition: ReportTemplateDefinition;
};
export type PublishedReportTemplate = {
  templateId: string;
  version: number;
  definition: ReportTemplateDefinition;
};
export type ReportCatalogueRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  rowVersion: number;
  publishedVersion: number | null;
};
export type ReportPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function reportTemplateQuery(definition: ReportTemplateDefinition) {
  return {
    datasetKey: definition.datasetKey,
    datasetVersion: definition.datasetVersion,
    sql: definition.sql,
    parameters: definition.parameters,
    columns: definition.columns,
  };
}
