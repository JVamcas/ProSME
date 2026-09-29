import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallCreationProgressRepository", () => ({
  readFundingCallCreationProgress: vi.fn(),
  saveFundingCallCreationProgress: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  getFundingCallCreationProgress,
  saveFundingCallCreationProgressForUser,
} from "@/modules/funding-calls/application/ServerFundingCallCreationProgressService";
import {
  readFundingCallCreationProgress,
  saveFundingCallCreationProgress,
} from "@/modules/funding-calls/infrastructure/FundingCallCreationProgressRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const draft = {
  createdAt: new Date("2026-09-29T08:00:00.000Z"),
  currentStep: "basics" as const,
  id: "20000000-0000-4000-8000-000000000001",
  ownerId: actorId,
  rowVersion: 1,
  updatedAt: new Date("2026-09-29T08:00:00.000Z"),
  values: {
    applicationDuplicatePolicy: "one_per_business" as const,
    closesAt: "",
    description: "",
    eligibilityRuleSetVersionId: "",
    eligibilitySummary: "",
    formVersionId: "",
    fundingInstrument: "",
    maximumGrantAmount: "",
    minimumGrantAmount: "",
    opensAt: "",
    publicContactEmail: "",
    publicContactName: "",
    publicContactPhone: "",
    thematicArea: "",
    title: "Started",
    totalBudgetEnvelope: "",
    workflowTemplateVersionId: "",
  },
};
const input = {
  currentStep: draft.currentStep,
  expectedRowVersion: null,
  values: draft.values,
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Funding administrator",
    email: "funding@example.test",
    id: actorId,
    identitySubject: "funding-admin-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => vi.clearAllMocks());

describe("funding-call creation draft service", () => {
  it("reads only the authenticated creator's draft", async () => {
    vi.mocked(readFundingCallCreationProgress).mockResolvedValue(draft);

    const result = await getFundingCallCreationProgress(
      user([permissionCodes.fundingCallCreate]),
    );

    expect(readFundingCallCreationProgress).toHaveBeenCalledWith(actorId);
    expect(result).toMatchObject({ rowVersion: 1, values: draft.values });
  });

  it("rejects an optimistic-lock conflict", async () => {
    vi.mocked(saveFundingCallCreationProgress).mockResolvedValue(null);

    await expect(saveFundingCallCreationProgressForUser(
      user([permissionCodes.fundingCallCreate]),
      input,
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("denies users without the create permission", async () => {
    await expect(getFundingCallCreationProgress(user([]))).rejects.toThrow();
    expect(readFundingCallCreationProgress).not.toHaveBeenCalled();
  });
});
