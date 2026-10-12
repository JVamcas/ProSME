import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowCoiRepository", () => ({
  changeTaskCoi: vi.fn(), readTaskCoiGate: vi.fn(),
}));
vi.mock("@/modules/forms/application/ServerSystemFormService", () => ({
  getPublishedSystemFormRuntimeVersion: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskAccessRepository", () => ({ readWorkflowTaskAccess: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowCoiReviewRepository", () => ({ readPendingWorkflowCoiReview: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowReviewerReplacementRepository", () => ({ replaceWorkflowReviewer: vi.fn() }));
import { declareWorkflowTaskCoi } from "@/modules/workflows/application/runtime/ServerWorkflowCoiService";
import { changeTaskCoi, readTaskCoiGate } from "@/modules/workflows/infrastructure/WorkflowCoiRepository";
import { getPublishedSystemFormRuntimeVersion } from "@/modules/forms/application/ServerSystemFormService";
import { coiActor as actor, coiTaskId as taskId, coiForm as form, coiAnswers as answers, coiSectionId as sectionId } from "../../support/WorkflowCoiFixture";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readTaskCoiGate).mockResolvedValue({
    assignedUserId: actor.id, coiFormVersionId: form.versionId, gated: true,
    rowVersion: 2, stageInstanceId: sectionId, state: "DECLARATION_REQUIRED",
    status: "PENDING", taskId, taskName: "Review",
  });
  vi.mocked(getPublishedSystemFormRuntimeVersion).mockResolvedValue(form);
});
describe("complete COI declaration answers", () => {
  it("captures all configured answers and the exact form definition", async () => {
    vi.mocked(changeTaskCoi).mockResolvedValue({ state: "PENDING_REVIEW" });
    const values = { ...answers, HAS_CONFLICT: true, DISCLOSURE_TEXT: "Relationship" };
    await declareWorkflowTaskCoi(actor, {
      taskId, expectedRowVersion: 2, formVersionId: form.versionId, values,
    });
    expect(changeTaskCoi).toHaveBeenCalledWith(expect.objectContaining({
      decision: "DISCLOSE", disclosureText: "Relationship",
      declaration: { formVersionId: form.versionId, values, form },
    }));
  });

  it.each([
    { ...answers, SIGNATURE: undefined },
    { ...answers, CONFIRMATION: false },
    { ...answers, EXTRA: "Unconfigured field" },
    { ...answers, HAS_CONFLICT: "false" },
  ])("rejects invalid or unconfigured answers", async (values) => {
    await expect(declareWorkflowTaskCoi(actor, {
      taskId, expectedRowVersion: 2, formVersionId: form.versionId, values,
    })).rejects.toThrow();
    expect(changeTaskCoi).not.toHaveBeenCalled();
  });

  it("rejects a submitted form version different from the task binding before loading the form", async () => {
    await expect(declareWorkflowTaskCoi(actor, {
      taskId, expectedRowVersion: 2, formVersionId: sectionId, values: answers,
    })).rejects.toThrow("COI state or task changed");
    expect(getPublishedSystemFormRuntimeVersion).not.toHaveBeenCalled();
    expect(changeTaskCoi).not.toHaveBeenCalled();
  });

  it("denies declaration without process permission", async () => {
    await expect(declareWorkflowTaskCoi({ ...actor, capabilities: new Set() }, {
      taskId, expectedRowVersion: 2, formVersionId: form.versionId, values: answers,
    })).rejects.toThrow();
    expect(readTaskCoiGate).not.toHaveBeenCalled();
    expect(changeTaskCoi).not.toHaveBeenCalled();
  });

});
