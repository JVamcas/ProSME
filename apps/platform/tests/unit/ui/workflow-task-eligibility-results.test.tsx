import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
  useSaveTaskReviewDraft: () => ({
    isError: false,
    isPending: false,
    mutate: vi.fn(),
  }),
  useCompleteWorkflowTask: () => ({
    isError: false,
    isPending: false,
    mutate: vi.fn(),
  }),
}));
vi.mock("@/modules/forms/ui/renderer/DynamicFormTask", () => ({
  DynamicFormTask: ({ eligibilityEvaluation }: {
    eligibilityEvaluation?: { outcome: string | null } | null;
  }) => (
    <div data-testid="bound-form">
      Bound form result: {eligibilityEvaluation?.outcome ?? "pending"}
    </div>
  ),
}));
vi.mock("@/modules/eligibility/ui/screening/AuthoritativeEligibilityTask", () => ({
  AuthoritativeEligibilityTask: () => (
    <div data-testid="standalone-eligibility">Standalone eligibility</div>
  ),
}));
vi.mock("@/modules/work-queue/ui/WorkflowTaskDecisionActions", () => ({
  WorkflowTaskDecisionActions: () => null,
}));

import { AuthoritativeEligibilityResult } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityResult";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskReviewPanel } from "@/modules/work-queue/ui/WorkflowTaskReviewPanel";

const evaluation = {
  eligible: true,
  evaluationId: "11111111-1111-4111-8111-111111111111",
  evaluationNumber: 2,
  hardFailureCount: 0,
  manualScreeningRequired: false,
  outcome: "ELIGIBLE" as const,
  softFailureCount: 1,
  warningCount: 3,
};

const task: TaskDetail = {
  actions: [],
  applicantName: "Test applicant",
  applicationId: "44444444-4444-4444-8444-444444444444",
  businessName: null,
  canEvaluateEligibility: true,
  checklistCompleted: false,
  checklistItems: [],
  commentCompleted: false,
  commentFields: [],
  displayMode: "STEP_PROGRESS",
  documentRequirements: [],
  documentsCompleted: false,
  dueAt: null,
  eligibilityEvaluation: evaluation,
  formCompleted: true,
  formName: "Eligibility verification form",
  formVersionId: "22222222-2222-4222-8222-222222222222",
  fundingCallTitle: "Test funding call",
  hasChecklist: false,
  reference: "TEST-001",
  resultComments: [],
  resultDocuments: [],
  resultItems: [],
  resultScores: [],
  rowVersion: 2,
  runtimeVersion: 1,
  stageInstanceId: "55555555-5555-4555-8555-555555555555",
  stageName: "Administrative screening",
  scoring: null,
  scoringCompleted: false,
  taskInstanceId: "33333333-3333-4333-8333-333333333333",
  taskName: "Eligibility decision",
  taskStatus: "PENDING",
  workflowInstanceId: "66666666-6666-4666-8666-666666666666",
};

describe("task eligibility results", () => {
  it("shows a bound form as one section without a separate eligibility card", () => {
    const markup = renderToStaticMarkup(<WorkflowTaskReviewPanel task={task} />);

    expect(markup).toContain("1 of 1 sections complete");
    expect(markup).toContain("Bound form result: ELIGIBLE");
    expect(markup).not.toContain("Standalone eligibility");
  });

  it("shows a disabled Complete Task button until eligibility is evaluated", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskReviewPanel
        task={{ ...task, eligibilityEvaluation: null, formCompleted: false }}
      />,
    );
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Complete Task<\/button>/);
  });

  it("shows an enabled Complete Task button when required work is ready", () => {
    const markup = renderToStaticMarkup(<WorkflowTaskReviewPanel task={task} />);
    expect(markup).toContain("Complete Task</button>");
    expect(markup).not.toMatch(/<button[^>]*disabled=""[^>]*>Complete Task<\/button>/);
  });

  it("keeps completion disabled until optional review fields have been saved", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskReviewPanel
        task={{
          ...task,
          canEvaluateEligibility: false,
          commentFields: [{
            displayOrder: 1,
            helpText: "",
            key: "recommendation",
            label: "Recommendation",
            mandatory: false,
            visibility: "INTERNAL_ONLY",
          }],
          eligibilityEvaluation: null,
          formCompleted: false,
          formVersionId: null,
        }}
      />,
    );
    expect(markup).toContain("Autosave pending");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Complete Task<\/button>/);
  });

  it("shows the recorded outcome and failure counts inside the result view", () => {
    const markup = renderToStaticMarkup(
      <AuthoritativeEligibilityResult evaluation={evaluation} />,
    );

    expect(markup).toContain("Eligibility result");
    expect(markup).toContain("Eligible");
    expect(markup).toContain("Hard failures");
    expect(markup).toContain("Soft failures");
    expect(markup).toContain("Warnings");
  });
});
