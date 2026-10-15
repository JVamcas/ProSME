import "server-only";
import { formatWorkflowStageScore } from "../domain/WorkflowStageScoreDisplay";
import { readFile } from "node:fs/promises";
import {
  createReportExport,
  reportArtifactContentTypes,
} from "@/modules/reporting/infrastructure/ReportExportWriter";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { consumeWorkflowStageApplications } from "./WorkflowStageApplicationsRepository";

export async function writeWorkflowStageFunnelExport(
  fundingCallId: string,
  actorId: string,
  stageKey: string,
  signal: AbortSignal,
) {
  const headings = [
    "Reference",
    "Applicant",
    "Business",
    "Legal name",
    "Registration number",
    "Business type",
    "Sector",
    "Region",
    "Reached stage (Africa/Windhoek)",
    "Submitted (Africa/Windhoek)",
    "Funding call",
    "Stage",
    "Latest run",
    "Average score",
    "Comments",
  ];
  const writer = await createReportExport(
    {
      columns: headings.map((name) => ({ name, type: "text" as const })),
    },
    "CSV",
    signal,
  );
  try {
    await consumeWorkflowStageApplications(
      fundingCallId,
      actorId,
      stageKey,
      signal,
      async (items) => {
        await writer.onBatch(
          items.map((item) => [
            item.reference,
            item.applicantName,
            item.businessName,
            item.legalName,
            item.registrationNumber,
            item.businessType,
            item.sector,
            item.region,
            formatLocalDateTime24(item.reachedAt, "—", "Africa/Windhoek"),
            formatLocalDateTime24(item.submittedAt, "—", "Africa/Windhoek"),
            item.fundingCallTitle,
            item.stageName,
            item.iterationNumber,
            formatWorkflowStageScore(item),
            item.comments,
          ]),
          signal,
        );
      },
    );
    const result = await writer.finish();
    return {
      body: await readFile(result.path),
      contentType: reportArtifactContentTypes.CSV,
      fileName: `stage-applications-${stageKey.replace(/[^a-zA-Z0-9_-]/g, "-")}.csv`,
    };
  } finally {
    await writer.dispose();
  }
}
