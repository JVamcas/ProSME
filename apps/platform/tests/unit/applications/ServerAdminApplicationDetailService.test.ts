import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerAdminApplicationService", () => ({
  getAdminApplicationOverview: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationSubmissionSnapshotService", () => ({
  getApplicationSubmissionSnapshot: vi.fn(),
}));
vi.mock("@/modules/applications/infrastructure/AttachedApplicationFormRepository", () => ({
  getAttachedApplicationForm: vi.fn(),
}));

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getAdminApplicationOverview } from "@/modules/applications/ServerAdminApplicationService";
import { getAdminApplicationDetail } from "@/modules/applications/ServerAdminApplicationDetailService";
import { getApplicationSubmissionSnapshot } from "@/modules/applications/ServerApplicationSubmissionSnapshotService";
import { getAttachedApplicationForm } from "@/modules/applications/infrastructure/AttachedApplicationFormRepository";

const user = { id: "staff-user" } as never;
const applicationId = "10000000-0000-4000-8000-000000000001";
const formVersionId = "20000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminApplicationOverview).mockResolvedValue({
    applicationId,
    applicantName: "Applicant",
    businessName: "Example SME",
    businessType: null,
    coFunding: null,
    currentStageName: "Screening",
    publicStatus: {
      actionRequired: false,
      description: "Your application is being checked for completeness and eligibility.",
      label: "Application under assessment",
      status: "UNDER_REVIEW",
    },
    updatedAt: "2026-09-24T13:00:00.000Z",
    industry: null,
    location: null,
    opportunityTitle: "Growth Grant",
    priority: null,
    reference: "SME-001",
    requestedAmount: 250000,
    stages: [{
      endedAt: null,
      name: "Screening",
      startedAt: "2026-09-24T12:00:00.000Z",
      status: "ACTIVE",
    }],
    submittedAt: "2026-09-24T12:00:00.000Z",
  });
  vi.mocked(getApplicationSubmissionSnapshot).mockResolvedValue({
    snapshot: {
      applicant: { displayName: "Lodged Applicant", userId: "private-id" },
      business: { legalName: "Lodged SME" },
      documents: [{
        id: "30000000-0000-4000-8000-000000000003",
        originalName: "Business plan.pdf",
        requirementKey: "BUSINESS_PLAN",
        sizeBytes: 2048,
      }],
      form: {
        normalizedValues: { GOAL: "Lodged answer", INTERNAL: "Hidden" },
        versionId: formVersionId,
      },
      fundingCall: { id: "40000000-0000-4000-8000-000000000004" },
    },
  } as never);
  vi.mocked(getAttachedApplicationForm).mockResolvedValue({
    fields: [{
      key: "GOAL",
      label: "Project goal",
      order: 1,
      sectionId: "project-section",
      type: "TEXT",
    }],
    sections: [{
      id: "project-section",
      key: "project",
      order: 1,
      title: "Project",
    }],
    versionId: formVersionId,
  } as never);
});

describe("admin application detail", () => {
  it("renders the lodged form version and values after an authorized overview read", async () => {
    const detail = await getAdminApplicationDetail(
      user,
      applicationId,
      "correlation-id",
    );

    expect(getApplicationSubmissionSnapshot).toHaveBeenCalledWith(
      user,
      applicationId,
      "correlation-id",
    );
    expect(getAttachedApplicationForm).toHaveBeenCalledWith(
      formVersionId,
      "40000000-0000-4000-8000-000000000004",
    );
    expect(detail.model.statusBadgeLabel).toBe("IN PROGRESS");
    expect(detail.model.statusLabel).toBe("Application under assessment");
    expect(detail.model.statusDescription).toBe(
      "Your application is being checked for completeness and eligibility.",
    );
    expect(detail.model.facts.map((fact) => fact.label)).toEqual([
      "Business name",
      "Funding opportunity",
      "Application reference",
      "Form completion",
      "Amount requested",
      "Project location",
      "Submission date",
    ]);
    expect(detail.model.sections).toEqual([{
      key: "project",
      title: "Project",
      answers: [{
        key: "GOAL",
        label: "Project goal",
        value: "Lodged answer",
      }],
    }]);
    expect(detail.model.applicantDetails).toEqual([{
      label: "Name",
      value: "Lodged Applicant",
    }]);
    expect(detail.model.documents[0]?.href).toContain(
      `/api/admin/applications/${applicationId}/documents/`,
    );
  });

  it("does not access lodged data when the user cannot see the application", async () => {
    vi.mocked(getAdminApplicationOverview).mockResolvedValue(null);

    await expect(getAdminApplicationDetail(user, applicationId, "correlation-id"))
      .rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(getApplicationSubmissionSnapshot).not.toHaveBeenCalled();
    expect(getAttachedApplicationForm).not.toHaveBeenCalled();
  });
});
