import type { AuthenticatedUser } from "@/auth/types";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export const workflowTaskActorFixture: AuthenticatedUser = {
  id: "20000000-0000-4000-8000-000000000002",
  email: "reviewer@example.test",
  displayName: "Reviewer",
  userType: "staff",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  lastLoginAt: null,
  identitySubject: "test-reviewer",
  capabilities: new Set(),
  roleCodes: new Set(),
};


export const workflowTaskServiceFixture = {
  hasOpenRfi: false,
  prerequisitesComplete: true,
  assignedToActor: true,
  coiCleared: true,
  stageStatus: "ACTIVE",
  workflowStatus: "ACTIVE",
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
