import type {
  ReportRun,
  ReportArtifact,
  ReportRunEvent,
} from "@/modules/reporting/domain/Report";
import { websiteAnalyticsTemplate } from "@/modules/reporting/application/bootstrap/WebsiteAnalyticsTemplate";

export function reportRunDrawerFixture(): {
  run: ReportRun;
  artifacts: ReportArtifact[];
  events: ReportRunEvent[];
} {
  return {
    run: {
      id: "run",
      reportId: "report",
      reportName: "Website analytics",
      templateId: "template",
      templateVersion: 1,
      reportVersion: 2,
      actorId: "actor",
      format: "XLSX",
      definition: websiteAnalyticsTemplate.definition,
      values: { endDate: "2026-10-08", startDate: "2026-10-06" },
      runAt: "2026-10-09T10:00:00Z",
      timezone: "Africa/Windhoek",
      websiteScope: null,
      status: "PREPARING_SOURCE",
      createdAt: "2026-10-09T10:00:00Z",
      startedAt: null,
      finishedAt: null,
      rows: null,
      error: null,
      leaseToken: null,
    },
    artifacts: [],
    events: [],
  };
}
