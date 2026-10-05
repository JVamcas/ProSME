import type { WorkflowRfiDetail } from "@/modules/workflows/domain/runtime/WorkflowRfiView";

export function workflowRfiDetail(
  overrides: Partial<WorkflowRfiDetail> = {},
): WorkflowRfiDetail {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    applicationId: "20000000-0000-4000-8000-000000000002",
    taskId: "30000000-0000-4000-8000-000000000003",
    applicationReference: "TEST-RFI-1",
    applicationTitle: "Test funding call",
    question: "Explain the revised budget",
    instructions: "Provide the requested clarification.",
    createdAt: "2026-10-05T09:00:00Z",
    deadlineAt: "2099-10-12T09:00:00Z",
    isOverdue: false,
    respondedAt: null,
    closedAt: null,
    expiredAt: null,
    rowVersion: 2,
    status: "OPEN",
    correspondence: [],
    draft: null,
    response: null,
    editableFields: [
      {
        path: "BUDGET_CLARIFICATION",
        label: "Budget clarification",
        type: "TEXT",
        options: [],
        currentValue: "",
      },
    ],
    requestedDocuments: [],
    stageName: "Assessment",
    taskName: "Independent review",
    ...overrides,
  };
}
