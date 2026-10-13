import "server-only";
import { readFile } from "node:fs/promises";
import {
  createReportExport,
  reportArtifactContentTypes,
} from "@/modules/reporting/infrastructure/ReportExportWriter";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import type { AdminApplicationListRow } from "../ApplicationTypes";
import type { AdminApplicationExportInput } from "../api/AdminApplicationSchemas";

const headings = [
  "Application ID",
  "Reference",
  "Applicant",
  "Business",
  "Funding call",
  "Status",
  "Workflow stage",
  "Submitted (Africa/Windhoek)",
];

export async function writeAdminApplicationExport(
  format: AdminApplicationExportInput["format"],
  batches: AsyncIterable<AdminApplicationListRow[]>,
  signal: AbortSignal,
) {
  const writer = await createReportExport(
    {
      columns: headings.map((name) => ({ name, type: "text" as const })),
    },
    format,
    signal,
  );
  try {
    for await (const batch of batches) {
      await writer.onBatch(
        batch.map((row) => [
          row.applicationId,
          row.reference,
          row.applicantName,
          row.businessName,
          row.fundingCallTitle,
          row.processingStatus ?? row.applicantStatus,
          row.activeStageName,
          formatLocalDateTime24(row.submittedAt, "—", "Africa/Windhoek"),
        ]),
        signal,
      );
    }
    const result = await writer.finish();
    return {
      body: await readFile(result.path),
      contentType: reportArtifactContentTypes[format],
      fileName: `applications.${format.toLowerCase()}`,
    };
  } finally {
    await writer.dispose();
  }
}
