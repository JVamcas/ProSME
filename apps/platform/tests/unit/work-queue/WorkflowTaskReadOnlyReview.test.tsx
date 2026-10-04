// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  upload: vi.fn(),
  completionHook: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useSaveTaskReviewDraft: () => ({ mutate: mocks.save, isPending: false }),
  useUploadWorkflowTaskDocument: () => ({ mutate: mocks.upload, isPending: false }),
  useCompleteWorkflowTask: mocks.completionHook,
}));
vi.mock("@/shared/ui/usePendingNavigationGuard", () => ({
  usePendingNavigationGuard: () => ({ pendingNavigationHref: null }),
}));

import { WorkflowTaskReviewPanel } from "@/modules/work-queue/ui/WorkflowTaskReviewPanel";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { workflowTaskServiceFixture } from "../../support/WorkflowTaskServiceFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe("read-only task review", () => {
  it("shows saved values and downloads without uploads, completion, or autosave", async () => {
    vi.useFakeTimers();
    const task: TaskDetail = {
      ...workflowTaskServiceFixture,
      readOnly: true,
      assignedUserName: "Another reviewer",
      actions: [],
      canEvaluateEligibility: true,
      eligibilityEvaluation: null,
      displayMode: "SECTIONS",
      dueAt: null,
      hasChecklist: true,
      checklistCompleted: false,
      // An optional missing answer normally creates an initial autosave patch.
      checklistItems: [{ code: "OPTIONAL", label: "Optional check", required: false }],
      resultItems: [],
      commentFields: [{
        key: "note", label: "Reviewer recommendation", helpText: "", mandatory: true,
        visibility: "INTERNAL_ONLY", displayOrder: 1,
      }],
      commentCompleted: true,
      resultComments: [{ key: "note", value: "Saved recommendation" }],
      documentsCompleted: true,
      resultDocuments: [],
      resultScores: [],
      scoringCompleted: false,
      documentRequirements: [{
        id: "document-requirement", name: "Report", mandatory: true, stableKey: "REPORT",
        acceptedFileTypes: ["PDF"], maximumSizeMb: 20, expiryDays: null,
        requestStatus: "SUPPLIED", uploader: "STAFF", verifier: "STAFF", templateReference: "",
        document: {
          contentType: "application/pdf", fileName: "saved-report.pdf", sizeBytes: 32,
          uploadedAt: "2026-10-04T10:00:00Z", versionId: "evidence-version", versionNumber: 1,
        },
      }],
    };
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<WorkflowTaskReviewPanel task={task} />));
    await act(async () => vi.advanceTimersByTime(1200));

    expect(container.textContent).toContain("Read-only · Assigned to Another reviewer");
    expect(container.querySelector<HTMLTextAreaElement>('textarea[name="comments.0.value"]')?.value).toBe("Saved recommendation");
    expect(container.querySelector("textarea")?.disabled).toBe(true);
    expect(container.querySelector('input[type="checkbox"]')?.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector('a[download]')?.getAttribute("href"))
      .toContain(`/tasks/${task.taskInstanceId}/documents/evidence-version/download`);
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.textContent).not.toContain("Complete Task");
    expect(container.textContent).not.toContain("Upload new version");
    expect(container.textContent).not.toContain("Autosave");
    expect(mocks.completionHook).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
