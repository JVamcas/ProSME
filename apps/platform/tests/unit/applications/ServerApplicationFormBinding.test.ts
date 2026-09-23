import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationRepository", () => ({
  createOwnedApplication: vi.fn(),
  findOwnedApplicationByOpportunity: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/ServerFundingOpportunityIntegration",
  () => ({ resolvePublishedApplicationFormBinding: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { createOwnedApplication } from "@/modules/applications/infrastructure/ApplicationRepository";
import {
  ApplicationOpportunityUnavailableError,
  createApplication,
} from "@/modules/applications/ServerApplicationService";
import { resolvePublishedApplicationFormBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";

const fundingCallId = "00000000-0000-4000-8000-000000000042";

const applicant: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.fundingApplicationCreate]),
  createdAt: new Date(),
  displayName: "Applicant",
  email: "applicant@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "applicant-subject",
  lastLoginAt: null,
  roleCodes: new Set(["applicant"]),
  status: "active",
  updatedAt: new Date(),
  userType: "applicant",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application form-version binding", () => {
  it("fails closed when an open call has no application form binding", async () => {
    vi.mocked(resolvePublishedApplicationFormBinding).mockResolvedValue({
      eligibilityRuleSetVersionId:
        "30000000-0000-4000-8000-000000000001",
      formVersionId: null,
      id: fundingCallId,
      status: "open",
      title: "Growth Fund",
    } as never);

    await expect(createApplication(applicant, fundingCallId)).rejects
      .toBeInstanceOf(ApplicationOpportunityUnavailableError);
    expect(createOwnedApplication).not.toHaveBeenCalled();
  });

  it("fails closed when an open call has no eligibility binding", async () => {
    vi.mocked(resolvePublishedApplicationFormBinding).mockResolvedValue({
      eligibilityRuleSetVersionId: null,
      formVersionId: "20000000-0000-4000-8000-000000000001",
      id: fundingCallId,
      status: "open",
      title: "Growth Fund",
    } as never);

    await expect(createApplication(applicant, fundingCallId)).rejects
      .toBeInstanceOf(ApplicationOpportunityUnavailableError);
    expect(createOwnedApplication).not.toHaveBeenCalled();
  });
});
