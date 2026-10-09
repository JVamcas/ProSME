import { z } from "zod";
import {
  reportFormatSchema,
  reportTemplateDefinitionSchema,
} from "./ReportDefinition";

export const reportDefaultsSchema = z
  .object({
    values: z.record(z.string(), z.unknown()),
    period: z
      .enum(["explicit", "previous-month", "website-completed"])
      .default("explicit"),
  })
  .strict();
export type ConfiguredReport = {
  id: string;
  key: string;
  name: string;
  description: string;
  templateId: string;
  templateVersion: number;
  defaults: z.infer<typeof reportDefaultsSchema>;
  format: z.infer<typeof reportFormatSchema>;
  ownerId: string;
  rowVersion: number;
  reportVersion: number;
  definition: z.infer<typeof reportTemplateDefinitionSchema>;
};
export type ConfiguredReportCatalogueRow = Pick<
  ConfiguredReport,
  "id" | "name" | "description" | "format" | "templateVersion"
>;
export type ConfiguredReportDetails = ConfiguredReport & {
  datasetName: string;
  templateName: string;
};
export type ReportRun = {
  id: string;
  reportId: string;
  reportName: string;
  templateId: string;
  templateVersion: number;
  reportVersion: number;
  actorId: string;
  format: z.infer<typeof reportFormatSchema>;
  definition: z.infer<typeof reportTemplateDefinitionSchema>;
  values: Record<string, unknown>;
  runAt: string;
  timezone: string;
  websiteScope: { propertyId: string; collectionStart: string } | null;
  status: "QUEUED" | "PREPARING_SOURCE" | "RUNNING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  rows: number | null;
  error: string | null;
  leaseToken: string | null;
};
export type ReportRunSummary = Pick<
  ReportRun,
  | "id"
  | "status"
  | "actorId"
  | "createdAt"
  | "startedAt"
  | "finishedAt"
  | "rows"
  | "format"
  | "error"
> & {
  actorName: string;
  actorEmail: string;
};
export type ReportArtifact = {
  id: string;
  runId: string;
  kind: "OUTPUT" | "ERROR";
  objectKey: string;
  filename: string;
  contentType: string;
  bytes: number;
  checksum: string;
};
export type ReportRunEvent = {
  key: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
};
