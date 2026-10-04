import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  formVersionIsBindable: vi.fn(async () => true),
  getConfigurableFormFields: vi.fn(async () => []),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  eligibilityRuleSetVersionIsBindable: vi.fn(async () => true),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findTestableEligibilityRuleSetForEvaluation: vi.fn(async () => ({
    ruleSetId: "30000000-0000-4000-8000-000000000002",
    rules: [],
    versionId: "30000000-0000-4000-8000-000000000001",
    versionNumber: 1,
  })),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputRepository", () => ({
  listEligibilityInputs: vi.fn(async () => []),
}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityRuleSetContexts: vi.fn(async () => []),
  resolveFundingCallEligibilityContext: vi.fn(async () => ({ sources: [] })),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  workflowTemplateVersionIsBindable: vi.fn(async () => true),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
  updateDraftFundingCall: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { updateFundingCall } from "@/modules/funding-calls/application/ServerFundingCallService";
import { formVersionIsBindable } from "@/modules/forms/infrastructure/FormRepository";
import {
  readFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const input = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  expectedRowVersion: 1,
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME Fund-2027-01",
  slug: "sme-growth-fund-2027",
  thematicArea: "Business growth",
  title: "SME Fund Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
};
const stored = {
  ...input,
  closesAt: new Date(input.closesAt),
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  id: callId,
  opensAt: new Date(input.opensAt),
  rowVersion: 1,
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
  updatedBy: actorId,
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Funding administrator",
    email: "funding-admin@example.test",
    id: actorId,
    identitySubject: "funding-admin-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(formVersionIsBindable).mockReset().mockResolvedValue(true);
  vi.mocked(readFundingCallById).mockResolvedValue(stored);
});

describe("ServerFundingCallService draft updates", () => {
  it.each([
    "formVersionId",
    "eligibilityRuleSetVersionId",
    "workflowTemplateVersionId",
  ] as const)("rejects changing locked %s", async (field) => {
    vi.mocked(readFundingCallById).mockResolvedValue({
      ...stored,
      attachmentsLockedAt: new Date(),
    });
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      { ...input, [field]: null },
    )).rejects.toThrow("applications have already been created");
    expect(updateDraftFundingCall).not.toHaveBeenCalled();
  });

  it("allows metadata amendments while the exact attachments stay locked", async () => {
    vi.mocked(formVersionIsBindable).mockResolvedValueOnce(false);
    const locked = { ...stored, attachmentsLockedAt: new Date() };
    vi.mocked(readFundingCallById).mockResolvedValue(locked);
    vi.mocked(updateDraftFundingCall).mockResolvedValue({
      ...locked,
      title: "Amended funding call",
      rowVersion: 2,
    });
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      { ...input, title: "Amended funding call" },
    )).resolves.toMatchObject({ title: "Amended funding call", rowVersion: 2 });
    expect(formVersionIsBindable).not.toHaveBeenCalled();
  });

  it("rejects stale drafts before checking attachments or writing", async () => {
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      { ...input, expectedRowVersion: 2 },
    )).rejects.toThrow("changed");
    expect(updateDraftFundingCall).not.toHaveBeenCalled();
  });

  it("denies draft edits without the explicit edit permission", async () => {
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallRead]),
      callId,
      input,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateDraftFundingCall).not.toHaveBeenCalled();
  });

  it("uses the explicit edit permission to edit a draft", async () => {
    vi.mocked(updateDraftFundingCall).mockResolvedValue({
      ...stored,
      rowVersion: 2,
    });

    const result = await updateFundingCall(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      input,
    );

    expect(updateDraftFundingCall).toHaveBeenCalledWith(
      actorId,
      callId,
      input,
    );
    expect(result.rowVersion).toBe(2);
  });
});
