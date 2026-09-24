import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerApplicationFormService", () => ({
  getOwnApplicationDraft: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationService", () => ({
  getOwnApplicationStatus: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationSubmissionSnapshotService", () => ({
  getApplicationSubmissionSnapshot: vi.fn(),
}));
vi.mock("@/modules/applications/application/ServerApplicationDocumentService", () => ({
  getOwnApplicationDocuments: vi.fn(),
}));

import { getOwnApplicationDocuments } from "@/modules/applications/application/ServerApplicationDocumentService";
import { getOwnApplicationReadView } from "@/modules/applications/ServerApplicationReadViewService";
import { getOwnApplicationDraft } from "@/modules/applications/ServerApplicationFormService";
import { getOwnApplicationStatus } from "@/modules/applications/ServerApplicationService";
import { getApplicationSubmissionSnapshot } from "@/modules/applications/ServerApplicationSubmissionSnapshotService";

const actor = { id: "owner-id" } as never;
const applicationId = "10000000-0000-4000-8000-000000000001";
const formVersionId = "20000000-0000-4000-8000-000000000002";
const draft = {
  form: {
    fields: [{ key: "GOAL", type: "TEXT", sectionId: "section" }],
    sections: [{ id: "section", key: "project", title: "Project" }],
    versionId: formVersionId,
  },
  draftResponse: { values: { GOAL: "Changed after submission" } },
};
const summary = {
  id: applicationId,
  status: "draft",
  publicStatus: { label: "Draft", description: "Complete your application." },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOwnApplicationDraft).mockResolvedValue(draft as never);
  vi.mocked(getOwnApplicationStatus).mockResolvedValue(summary as never);
  vi.mocked(getOwnApplicationDocuments).mockResolvedValue({
    documents: [{
      fileName: "Business plan.pdf",
      requirementKey: "BUSINESS_PLAN",
      sizeBytes: 4096,
      storageStatus: "finalized",
      versionId: "30000000-0000-4000-8000-000000000003",
    }],
    requirements: [],
  } as never);
});

describe("own application read view", () => {
  it("uses saved dynamic answers and owned documents for a draft", async () => {
    const view = await getOwnApplicationReadView(actor, applicationId, "correlation");
    expect(view.values).toEqual({ GOAL: "Changed after submission" });
    expect(view.documents).toEqual([expect.objectContaining({
      name: "Business plan.pdf",
      versionId: "30000000-0000-4000-8000-000000000003",
    })]);
    expect(getApplicationSubmissionSnapshot).not.toHaveBeenCalled();
  });

  it("uses immutable lodged answers and document versions for a submitted application", async () => {
    vi.mocked(getOwnApplicationStatus).mockResolvedValue({
      ...summary,
      status: "submitted",
    } as never);
    vi.mocked(getApplicationSubmissionSnapshot).mockResolvedValue({
      snapshot: {
        applicant: { displayName: "Applicant", userId: "internal-id" },
        business: { legalName: "Example SME", id: "internal-business-id" },
        documents: [{
          id: "40000000-0000-4000-8000-000000000004",
          originalName: "Lodged plan.pdf",
          requirementKey: "BUSINESS_PLAN",
          sizeBytes: 5120,
        }],
        form: {
          normalizedValues: { GOAL: "Lodged answer", INTERNAL_KEY: "hidden" },
          versionId: formVersionId,
        },
      },
    } as never);

    const view = await getOwnApplicationReadView(actor, applicationId, "correlation");
    expect(view.values).toEqual({ GOAL: "Lodged answer" });
    expect(view.documents[0]?.name).toBe("Lodged plan.pdf");
    expect(view.applicantDetails).toEqual([{ label: "Name", value: "Applicant" }]);
    expect(view.businessDetails).toEqual([{ label: "Legal name", value: "Example SME" }]);
    expect(getOwnApplicationDocuments).not.toHaveBeenCalled();
  });

  it("does not read a snapshot when the owner-scoped application read fails", async () => {
    vi.mocked(getOwnApplicationStatus).mockRejectedValue(new Error("not owned"));
    await expect(getOwnApplicationReadView(actor, applicationId, "correlation"))
      .rejects.toThrow("not owned");
    expect(getApplicationSubmissionSnapshot).not.toHaveBeenCalled();
  });
});
