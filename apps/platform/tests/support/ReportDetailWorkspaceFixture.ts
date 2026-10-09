import type { ConfiguredReportDetails } from "@/modules/reporting/domain/Report";
import { applicationAgeingTemplate } from "@/modules/reporting/application/bootstrap/ApplicationAgeingTemplate";

export function reportDetailWorkspaceFixture(): ConfiguredReportDetails {
  return {
    id: "report",
    key: "application-ageing",
    name: "My ageing report",
    description: "Active applications and their elapsed time.",
    templateId: "6e3d5d45-5fc7-4bf4-bbee-dc1046e69d05",
    templateName: "Application Ageing",
    templateVersion: 1,
    datasetName: "Workflow Operations",
    defaults: {
      period: "explicit",
      values: { fundingCallId: null, stageCode: null, minimumAgeHours: 0 },
    },
    format: "XLSX",
    ownerId: "owner",
    rowVersion: 1,
    reportVersion: 1,
    definition: applicationAgeingTemplate.definition,
  };
}
