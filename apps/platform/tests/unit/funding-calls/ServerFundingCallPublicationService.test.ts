import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  formVersionIsPublished: vi.fn(),
  getConfigurableFormFields: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  eligibilityRuleSetVersionIsPublished: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findTestableEligibilityRuleSetForEvaluation: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  workflowTemplateVersionIsPublished: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository", () => ({
  transitionFundingCall: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  publishFundingCall,
  requirePublishedFundingCallBindings,
} from "@/modules/funding-calls/application/ServerFundingCallService";
import { transitionFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import {
  formVersionIsPublished,
  getConfigurableFormFields,
} from "@/modules/forms/infrastructure/FormRepository";
import { eligibilityRuleSetVersionIsPublished } from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { findTestableEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { workflowTemplateVersionIsPublished } from "@/modules/workflows/infrastructure/WorkflowRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const formVersionId = "20000000-0000-4000-8000-000000000001";
const eligibilityRuleSetVersionId = "30000000-0000-4000-8000-000000000001";
const workflowTemplateVersionId = "40000000-0000-4000-8000-000000000001";
const call = {
  closesAt: new Date("2027-03-31T15:00:00.000Z"),
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  createdBy: actorId,
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId,
  eligibilitySummary: null,
  formVersionId,
  fundingInstrument: "Grant",
  id: callId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2027-02-01T06:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME-2027-01",
  rowVersion: 1,
  slug: "sme-growth-fund-2027",
  status: "APPROVED" as const,
  suspendedFromStatus: null,
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: new Date("2026-09-20T08:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId,
};

function publisher(): AuthenticatedUser {
  return {
    capabilities: new Set([permissionCodes.fundingCallPublish]),
    createdAt: new Date(),
    displayName: "Funding publisher",
    email: "publisher@example.test",
    id: actorId,
    identitySubject: "publisher-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById).mockResolvedValue(call);
  vi.mocked(formVersionIsPublished).mockResolvedValue(true);
  vi.mocked(eligibilityRuleSetVersionIsPublished).mockResolvedValue(true);
  vi.mocked(workflowTemplateVersionIsPublished).mockResolvedValue(true);
  vi.mocked(getConfigurableFormFields).mockResolvedValue([]);
  vi.mocked(findTestableEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId: "50000000-0000-4000-8000-000000000001",
    rules: [],
    versionId: eligibilityRuleSetVersionId,
    versionNumber: 1,
  });
});

describe("funding call publication", () => {
  it("denies publication without the publish permission", async () => {
    await expect(publishFundingCall(
      { ...publisher(), capabilities: new Set() },
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(transitionFundingCall).not.toHaveBeenCalled();
  });

  it("blocks publication while the bound form is still draft", async () => {
    vi.mocked(formVersionIsPublished).mockResolvedValue(false);

    await expect(requirePublishedFundingCallBindings(call)).rejects.toThrow(
      "Select an application form version that is published.",
    );
  });

  it("blocks publication while the eligibility ruleset is still draft", async () => {
    vi.mocked(eligibilityRuleSetVersionIsPublished).mockResolvedValue(false);

    await expect(requirePublishedFundingCallBindings(call)).rejects.toThrow(
      "Select an eligibility ruleset version that is published.",
    );
  });

  it("publishes only after validating every bound version", async () => {
    vi.mocked(transitionFundingCall).mockResolvedValue({
      call: {
        ...call,
        rowVersion: 2,
        status: "SCHEDULED",
      },
      kind: "transitioned",
    });

    const result = await publishFundingCall(
      publisher(),
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    );

    expect(workflowTemplateVersionIsPublished).toHaveBeenCalledWith(
      workflowTemplateVersionId,
    );
    expect(transitionFundingCall).toHaveBeenCalledWith({
      actorId,
      command: "PUBLISH",
      correlationId: "correlation-id",
      expectedRowVersion: 1,
      fundingCallId: callId,
      idempotencyKey: "publish-key",
      now: expect.any(Date),
    });
    expect(result.status).toBe("SCHEDULED");
  });

  it("does not publish when the bound form is still draft", async () => {
    vi.mocked(formVersionIsPublished).mockResolvedValue(false);

    await expect(publishFundingCall(
      publisher(),
      callId,
      { expectedRowVersion: 1 },
      "publish-key",
      "correlation-id",
    )).rejects.toThrow("Select an application form version that is published.");

    expect(transitionFundingCall).not.toHaveBeenCalled();
  });
});
