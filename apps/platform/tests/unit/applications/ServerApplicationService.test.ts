import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/ApplicationRepository", () => ({
  createOwnedApplication: vi.fn(),
  findOwnedApplication: vi.fn(),
  findOwnedApplicationByOpportunity: vi.fn(),
  findAllApplications: vi.fn(),
  findApplicationsAssignedTo: vi.fn(),
  findAssignedApplicationById: vi.fn(),
  findApplicationById: vi.fn(),
  listOwnedApplications: vi.fn(),
  updateOwnedApplication: vi.fn(),
}));
vi.mock("@/db/repositories/BusinessRepository", () => ({
  findOwnedBusiness: vi.fn(),
}));
vi.mock("@/db/repositories/ApplicationDocumentRepository", () => ({
  hasRequiredApplicationDocuments: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/ServerFundingOpportunityIntegration",
  () => ({
    resolvePublishedApplicationFormBinding: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedApplication,
  findOwnedApplication,
  findOwnedApplicationByOpportunity,
  listOwnedApplications,
  updateOwnedApplication,
} from "@/db/repositories/ApplicationRepository";
import { findOwnedBusiness } from "@/db/repositories/BusinessRepository";
import { hasRequiredApplicationDocuments } from "@/db/repositories/ApplicationDocumentRepository";
import { resolvePublishedApplicationFormBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import {
  ApplicationBusinessConflictError,
  ApplicationConflictError,
  createApplication,
  getOwnApplication,
  listOwnApplications,
  updateOwnApplication,
} from "@/modules/applications/ServerApplicationService";
import { applicationStatusCounts } from "../../support/application-status-counts";
const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";
const formVersionId = "20000000-0000-4000-8000-000000000001";

function staffUser(granted: string[]): AuthenticatedUser {
  return {
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    email: "staff@example.test",
    displayName: "Staff User",
    userType: "staff",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    identitySubject: "firebase-subject",
    capabilities: new Set(granted),
    roleCodes: new Set(["programme_officer"]),
  };
}

const application = {
  businessId: null,
  businessName: null,
  businessSection: {},
  declarationAcceptance: null,
  declarationsSection: {},
  createdAt: new Date("2026-09-14T08:00:00.000Z"),
  currentSection: "business" as const,
  financialSection: {},
  formVersionId,
  fundingOpportunityId,
  fundingOpportunityTitle: "Growth Fund",
  id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
  ownerUserId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  projectSection: {},
  reference: null,
  rowVersion: 1,
  sectionCompletion: {
    business: false,
    declarations: false,
    documents: false,
    financial: false,
    project: false,
  },
  status: "draft" as const,
  submittedAt: null,
  updatedAt: new Date("2026-09-14T08:00:00.000Z"),
  workflowVersionId: null,
};
const businessId = "89e20de0-3558-4d63-90a4-8c9f5125df07";

beforeEach(() => {
  vi.clearAllMocks();
});
describe("applicant-owned application drafts", () => {
  it("creates an owner-scoped draft for an open opportunity", async () => {
    const user = staffUser([permissionCodes.fundingApplicationCreate]);
    vi.mocked(resolvePublishedApplicationFormBinding).mockResolvedValue({
      id: fundingOpportunityId,
      formVersionId,
      status: "open",
      title: "Growth Fund",
    } as never);
    vi.mocked(findOwnedApplicationByOpportunity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(application);
    vi.mocked(createOwnedApplication).mockResolvedValue(null);

    await expect(createApplication(user, fundingOpportunityId))
      .resolves.toMatchObject({
      fundingOpportunityId,
      id: application.id,
    });
    expect(createOwnedApplication).toHaveBeenCalledWith({
      formVersionId,
      fundingOpportunityId,
      fundingOpportunityTitle: "Growth Fund",
      ownerUserId: user.id,
    });
  });
  it("scopes list and detail reads to the authenticated owner", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnRead]);
    vi.mocked(listOwnedApplications).mockResolvedValue({
      counts: applicationStatusCounts,
      items: [application],
      total: 1,
    });
    vi.mocked(findOwnedApplication).mockResolvedValue(application);

    await expect(
      listOwnApplications(user, { limit: 25 }),
    ).resolves.toMatchObject({
      counts: { all: 2, draft: 1, submitted: 1 },
      items: [{ id: application.id, progressPercent: 0 }],
      total: 1,
    });
    await expect(
      getOwnApplication(user, application.id),
    ).resolves.toMatchObject({
      id: application.id,
      rowVersion: 1,
    });
    expect(listOwnedApplications).toHaveBeenCalledWith({
      after: undefined,
      limit: 25,
      ownerUserId: user.id,
      status: undefined,
    });
    expect(findOwnedApplication).toHaveBeenCalledWith(user.id, application.id);
  });

  it("rejects a stale update without writing", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    vi.mocked(findOwnedApplication).mockResolvedValue({
      ...application,
      rowVersion: 2,
    });

    await expect(
      updateOwnApplication(user, application.id, {
        data: {},
        expectedRowVersion: 1,
        intent: "save",
        section: "business",
      }),
    ).rejects.toBeInstanceOf(ApplicationConflictError);
    expect(updateOwnedApplication).not.toHaveBeenCalled();
  });
  it("derives completion and advances a valid section", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    const completed = {
      ...application,
      businessSection: { businessId },
      currentSection: "project" as const,
      rowVersion: 2,
      sectionCompletion: {
        business: true,
        declarations: false,
        documents: false,
        financial: false,
        project: false,
      },
    };
    vi.mocked(findOwnedApplication)
      .mockResolvedValueOnce(application)
      .mockResolvedValueOnce(completed);
    vi.mocked(updateOwnedApplication).mockResolvedValue({
      id: application.id,
      kind: "updated",
    });
    vi.mocked(findOwnedBusiness).mockResolvedValue({ id: businessId } as never);

    const result = await updateOwnApplication(user, application.id, {
      data: completed.businessSection,
      expectedRowVersion: 1,
      intent: "continue",
      section: "business",
    });
    expect(result.currentSection).toBe("project");
    expect(result.progressPercent).toBe(20);
    expect(updateOwnedApplication).toHaveBeenCalledWith(
      user.id,
      application.id,
      expect.anything(),
      completed.sectionCompletion,
      "project",
    );
  });

  it("rejects a business that is not owned by the applicant", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    vi.mocked(findOwnedApplication).mockResolvedValue(application);
    vi.mocked(findOwnedBusiness).mockResolvedValue(null as never);

    await expect(
      updateOwnApplication(user, application.id, {
        data: { businessId },
        expectedRowVersion: 1,
        intent: "continue",
        section: "business",
      }),
    ).rejects.toMatchObject({ name: "ApplicationBusinessUnavailableError" });
    expect(findOwnedBusiness).toHaveBeenCalledWith(user.id, businessId);
    expect(updateOwnedApplication).not.toHaveBeenCalled();
  });

  it("does not require workflow configuration to save a draft", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    const advanced = {
      ...application,
      currentSection: "financial" as const,
    };
    vi.mocked(findOwnedApplication)
      .mockResolvedValueOnce(advanced)
      .mockResolvedValueOnce({ ...advanced, rowVersion: 2 });
    vi.mocked(updateOwnedApplication).mockResolvedValue({
      id: application.id,
      kind: "updated",
    });

    await expect(
      updateOwnApplication(user, application.id, {
        data: {},
        expectedRowVersion: 1,
        intent: "save",
        section: "project",
      }),
    ).resolves.toMatchObject({ id: application.id });
    expect(resolvePublishedApplicationFormBinding).not.toHaveBeenCalled();
    expect(updateOwnedApplication).toHaveBeenCalledWith(
      user.id,
      application.id,
      expect.anything(),
      expect.anything(),
      "financial",
    );
  });

  it("rejects another application for the same business and funding call", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    vi.mocked(findOwnedApplication).mockResolvedValue(application);
    vi.mocked(findOwnedBusiness).mockResolvedValue({ id: businessId } as never);
    vi.mocked(updateOwnedApplication).mockResolvedValue({
      kind: "duplicate_business",
    });

    await expect(
      updateOwnApplication(user, application.id, {
        data: { businessId },
        expectedRowVersion: 1,
        intent: "continue",
        section: "business",
      }),
    ).rejects.toBeInstanceOf(ApplicationBusinessConflictError);
  });

  it("requires all supporting documents before advancing", async () => {
    const user = staffUser([permissionCodes.fundingApplicationOwnUpdate]);
    vi.mocked(findOwnedApplication).mockResolvedValue(application);
    vi.mocked(hasRequiredApplicationDocuments).mockResolvedValue(false);

    await expect(
      updateOwnApplication(user, application.id, {
        data: {},
        expectedRowVersion: 1,
        intent: "continue",
        section: "documents",
      }),
    ).rejects.toMatchObject({ name: "RequestValidationError" });
    expect(updateOwnedApplication).not.toHaveBeenCalled();
  });
});
