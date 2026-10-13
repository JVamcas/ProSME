import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository",
  () => ({
    createDocumentEvidenceVersion: vi.fn(),
    findDocumentEvidenceVersion: vi.fn(),
  }),
);
vi.mock("@/modules/work-queue/application/ServerWorkflowTaskService", () => ({
  getWorkflowTask: vi.fn(),
}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationDocumentPageReader",
  () => ({ readApplicationDocumentPageCount: vi.fn() }),
);
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { createDocumentEvidenceVersion } from "@/modules/workflows/infrastructure/WorkflowDocumentEvidenceRepository";
import { readApplicationDocumentPageCount } from "@/modules/applications/infrastructure/ApplicationDocumentPageReader";
import { uploadWorkflowTaskDocument } from "@/modules/work-queue/application/ServerWorkflowTaskDocumentService";
import { workflowTaskServiceFixture } from "../../support/WorkflowTaskServiceFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentRequirementItem } from "@/modules/work-queue/TaskTypes";

const actor: AuthenticatedUser = {
  id: "reviewer",
  displayName: "Reviewer",
  email: "reviewer@example.test",
  identitySubject: "reviewer",
  roleCodes: new Set(),
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  status: "active",
  capabilities: new Set([permissionCodes.workflowTaskAssignedProcess]),
};
const requirement: DocumentRequirementItem = {
  id: "requirement",
  stableKey: "DOCUMENT",
  name: "Evidence",
  mandatory: true,
  acceptedFileTypes: ["PDF"],
  acceptedExtensions: [".pdf"],
  maximumSizeMb: 4,
  maxPages: 3,
  expiryDays: null,
  uploader: "ANY",
  verifier: "ASSIGNED_REVIEWER",
  templateReference: "",
  requestStatus: "MISSING",
};
const storage = {
  put: vi.fn(),
  delete: vi.fn(),
  read: vi.fn(),
  finalize: vi.fn(),
};
const file = new File(["%PDF-evidence"], "evidence.pdf", {
  type: "application/pdf",
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowTask).mockResolvedValue({
    ...workflowTaskServiceFixture,
    taskStatus: "IN_PROGRESS",
    documentRequirements: [requirement],
  });
  vi.mocked(createDocumentEvidenceVersion).mockResolvedValue({
    id: "version",
  } as never);
  vi.mocked(readApplicationDocumentPageCount).mockResolvedValue(2);
});

describe("task document uploader and standard limits", () => {
  it.each(["ANY", "ASSIGNED_REVIEWER"] as const)(
    "allows an authorized assignee for %s",
    async (uploader) => {
      vi.mocked(readWorkflowTask).mockResolvedValue({
        ...workflowTaskServiceFixture,
        documentRequirements: [{ ...requirement, uploader }],
      });
      await uploadWorkflowTaskDocument(
        actor,
        workflowTaskServiceFixture.taskInstanceId,
        "requirement",
        file,
        storage,
      );
      expect(storage.put).toHaveBeenCalledTimes(1);
      expect(createDocumentEvidenceVersion).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects applicant-only documents before storage", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue({
      ...workflowTaskServiceFixture,
      documentRequirements: [{ ...requirement, uploader: "APPLICANT" }],
    });
    await expect(
      uploadWorkflowTaskDocument(
        actor,
        workflowTaskServiceFixture.taskInstanceId,
        "requirement",
        file,
        storage,
      ),
    ).rejects.toThrow("applicant");
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("does not let Any bypass assignment or permission checks", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue(null);
    await expect(
      uploadWorkflowTaskDocument(
        actor,
        "another-task",
        "requirement",
        file,
        storage,
      ),
    ).rejects.toThrow();
    expect(storage.put).not.toHaveBeenCalled();
  });
  it("rejects an excessive page count before writing storage or evidence", async () => {
    vi.mocked(readApplicationDocumentPageCount).mockResolvedValue(4);
    await expect(
      uploadWorkflowTaskDocument(
        actor,
        workflowTaskServiceFixture.taskInstanceId,
        "requirement",
        file,
        storage,
      ),
    ).rejects.toThrow("maximum is 3 pages");
    expect(storage.put).not.toHaveBeenCalled();
    expect(createDocumentEvidenceVersion).not.toHaveBeenCalled();
  });
});
