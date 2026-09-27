import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export const workflowTaskServiceFixture = {
  applicantName: "Applicant",
  applicationId: "79e20de0-3558-4d63-90a4-8c9f5125df08",
  businessName: "Business",
  checklistItems: [
    { code: "OWNERSHIP", label: "Ownership confirmed", required: true },
  ],
  config: {},
  documentRequirements: [],
  dueAt: new Date("2026-09-20T08:00:00Z"),
  fundingCallTitle: "Funding call",
  formCompleted: false,
  formName: null,
  permissions: defaultWorkflowElementPermissions,
  reference: "SMEF-2026-000001",
  result: null,
  rowVersion: 2,
  runtimeVersion: 1,
  scoring: null,
  stageInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df12",
  stageName: "Pre-screening",
  taskInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df09",
  taskName: "Pre-screening checklist",
  taskStatus: "PENDING" as const,
  taskType: "CONTRIBUTING" as const,
  workflowInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df13",
};
