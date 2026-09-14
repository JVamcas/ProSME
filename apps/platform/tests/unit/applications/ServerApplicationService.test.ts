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
vi.mock(
  "@/modules/funding-opportunities/ServerFundingOpportunityIntegration",
  () => ({
    findPublishedFundingOpportunity: vi.fn(),
  }),
);

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedApplication,
  findOwnedApplication,
  findOwnedApplicationByOpportunity,
  listOwnedApplications,
  updateOwnedApplication,
  findAllApplications,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
  findApplicationById,
} from "@/db/repositories/ApplicationRepository";
import { findOwnedBusiness } from "@/db/repositories/BusinessRepository";
import { findPublishedFundingOpportunity } from "@/modules/funding-opportunities/ServerFundingOpportunityIntegration";
import {
  ApplicationConflictError,
  createApplication,
  getOwnApplication,
  getApplication,
  getApplications,
  listOwnApplications,
  updateOwnApplication,
} from "@/modules/applications/ServerApplicationService";

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
  businessSection: {},
  createdAt: new Date("2026-09-14T08:00:00.000Z"),
  currentSection: "business" as const,
  financialSection: {},
  fundingOpportunityId: 42,
  fundingOpportunityTitle: "Growth Fund",
  id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
  ownerUserId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  projectSection: {},
  rowVersion: 1,
  sectionCompletion: { business: false, financial: false, project: false },
  status: "draft" as const,
  updatedAt: new Date("2026-09-14T08:00:00.000Z"),
};
const businessId = "89e20de0-3558-4d63-90a4-8c9f5125df07";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application service authorization", () => {
  it("loads records through the repository for authorized staff", async () => {
    vi.mocked(findAllApplications).mockResolvedValue([]);
    const user = staffUser([capabilities.applicationReadAll]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findAllApplications).toHaveBeenCalledOnce();
  });

  it("limits assigned readers to their repository scope", async () => {
    vi.mocked(findApplicationsAssignedTo).mockResolvedValue([]);
    const user = staffUser([capabilities.applicationReadAssigned]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findApplicationsAssignedTo).toHaveBeenCalledWith(user.id);
    expect(findAllApplications).not.toHaveBeenCalled();
  });

  it("rejects broad admin access without an application read grant", async () => {
    const user = staffUser([capabilities.adminAccess]);

    await expect(getApplications(user)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(findAllApplications).not.toHaveBeenCalled();
    expect(findApplicationsAssignedTo).not.toHaveBeenCalled();
  });

  it("checks authorization before loading a single application", async () => {
    const user = staffUser([]);

    await expect(getApplication(user, "SMEF-1")).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(findApplicationById).not.toHaveBeenCalled();
    expect(findAssignedApplicationById).not.toHaveBeenCalled();
  });
});

describe("applicant-owned application drafts", () => {
  it("creates an owner-scoped draft for an open opportunity", async () => {
    const user = staffUser([capabilities.applicationCreate]);
    vi.mocked(findPublishedFundingOpportunity).mockResolvedValue({
      id: 42,
      status: "open",
      title: "Growth Fund",
    } as never);
    vi.mocked(findOwnedApplicationByOpportunity)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(application);
    vi.mocked(createOwnedApplication).mockResolvedValue(null);

    await expect(createApplication(user, 42)).resolves.toMatchObject({
      fundingOpportunityId: 42,
      id: application.id,
    });
    expect(createOwnedApplication).toHaveBeenCalledWith({
      fundingOpportunityId: 42,
      fundingOpportunityTitle: "Growth Fund",
      ownerUserId: user.id,
    });
  });

  it("scopes list and detail reads to the authenticated owner", async () => {
    const user = staffUser([capabilities.applicationReadOwn]);
    vi.mocked(listOwnedApplications).mockResolvedValue({
      items: [application],
      total: 1,
    });
    vi.mocked(findOwnedApplication).mockResolvedValue(application);

    await expect(
      listOwnApplications(user, { limit: 25 }),
    ).resolves.toMatchObject({
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
    const user = staffUser([capabilities.applicationUpdateOwn]);
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
    const user = staffUser([capabilities.applicationUpdateOwn]);
    const completed = {
      ...application,
      businessSection: { businessId },
      currentSection: "project" as const,
      rowVersion: 2,
      sectionCompletion: { business: true, financial: false, project: false },
    };
    vi.mocked(findOwnedApplication)
      .mockResolvedValueOnce(application)
      .mockResolvedValueOnce(completed);
    vi.mocked(updateOwnedApplication).mockResolvedValue(application.id);
    vi.mocked(findOwnedBusiness).mockResolvedValue({ id: businessId } as never);

    const result = await updateOwnApplication(user, application.id, {
      data: completed.businessSection,
      expectedRowVersion: 1,
      intent: "continue",
      section: "business",
    });
    expect(result.currentSection).toBe("project");
    expect(result.progressPercent).toBe(33);
    expect(updateOwnedApplication).toHaveBeenCalledWith(
      user.id,
      application.id,
      expect.anything(),
      completed.sectionCompletion,
      "project",
    );
  });

  it("rejects a business that is not owned by the applicant", async () => {
    const user = staffUser([capabilities.applicationUpdateOwn]);
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
    const user = staffUser([capabilities.applicationUpdateOwn]);
    vi.mocked(findOwnedApplication)
      .mockResolvedValueOnce(application)
      .mockResolvedValueOnce({ ...application, rowVersion: 2 });
    vi.mocked(updateOwnedApplication).mockResolvedValue(application.id);

    await expect(
      updateOwnApplication(user, application.id, {
        data: {},
        expectedRowVersion: 1,
        intent: "save",
        section: "business",
      }),
    ).resolves.toMatchObject({ id: application.id });
    expect(findPublishedFundingOpportunity).not.toHaveBeenCalled();
  });
});
