import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  formVersionIsBindable: vi.fn(),
  formVersionIsPublished: vi.fn(),
  getConfigurableFormFields: vi.fn(),
  listBindableFormVersions: vi.fn(),
  listPublishedFormVersions: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityRuleSetRepository", () => ({
  eligibilityRuleSetVersionIsBindable: vi.fn(),
  eligibilityRuleSetVersionIsPublished: vi.fn(),
  listBindableEligibilityRuleSetVersions: vi.fn(),
  listPublishedEligibilityRuleSetVersions: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityEvaluationRepository", () => ({
  findTestableEligibilityRuleSetForEvaluation: vi.fn(),
}));
vi.mock("@/modules/eligibility/infrastructure/EligibilityInputRepository", () => ({
  listEligibilityInputs: vi.fn(async () => []),
}));
vi.mock("@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration", () => ({
  resolveEligibilityRuleSetContexts: vi.fn(async () => []),
  resolveFundingCallEligibilityContext: vi.fn(async (call) => ({
    fundingCallId: call.id,
    fundingCallTitle: call.title,
    sources: [],
  })),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRepository", () => ({
  listBindableWorkflowVersions: vi.fn(),
  listPublishedWorkflowVersions: vi.fn(),
  workflowTemplateVersionIsBindable: vi.fn(),
  workflowTemplateVersionIsPublished: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  insertFundingCall: vi.fn(),
  readFundingCallById: vi.fn(),
  readFundingCallByPublicIdentifier: vi.fn(),
  readFundingCalls: vi.fn(),
  updateDraftFundingCall: vi.fn(),
}));
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  createFundingCall,
  getFundingCallByPublicIdentifier,
  updateFundingCall,
} from "@/modules/funding-calls/application/ServerFundingCallService";
import {
  insertFundingCall,
  readFundingCallById,
  readFundingCallByPublicIdentifier,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import {
  formVersionIsBindable,
  formVersionIsPublished,
  getConfigurableFormFields,
} from "@/modules/forms/infrastructure/FormRepository";
import {
  eligibilityRuleSetVersionIsBindable,
  eligibilityRuleSetVersionIsPublished,
} from "@/modules/eligibility/infrastructure/EligibilityRuleSetRepository";
import { findTestableEligibilityRuleSetForEvaluation } from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { workflowTemplateVersionIsBindable } from "@/modules/workflows/infrastructure/WorkflowRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const formVersionId = "20000000-0000-4000-8000-000000000001";
const eligibilityRuleSetVersionId = "30000000-0000-4000-8000-000000000001";
const workflowTemplateVersionId = "40000000-0000-4000-8000-000000000001";
const input = {
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
  eligibilitySummary: "Registered Namibian SMEs may qualify.",
  eligibilityRuleSetVersionId,
  formVersionId,
  fundingInstrument: "Grant",
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: "2027-02-01T06:00:00.000Z",
  publicContactEmail: "funding@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME-2027-01",
  slug: "sme-growth-fund-2027",
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  workflowTemplateVersionId,
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
  vi.mocked(eligibilityRuleSetVersionIsBindable).mockResolvedValue(true);
  vi.mocked(eligibilityRuleSetVersionIsPublished).mockResolvedValue(true);
  vi.mocked(formVersionIsBindable).mockResolvedValue(true);
  vi.mocked(formVersionIsPublished).mockResolvedValue(true);
  vi.mocked(getConfigurableFormFields).mockResolvedValue([]);
  vi.mocked(findTestableEligibilityRuleSetForEvaluation).mockResolvedValue({
    ruleSetId: "30000000-0000-4000-8000-000000000002",
    rules: [],
    versionId: eligibilityRuleSetVersionId,
    versionNumber: 1,
  });
  vi.mocked(workflowTemplateVersionIsBindable).mockResolvedValue(true);
  vi.mocked(readFundingCallById).mockResolvedValue(stored);
});
describe("ServerFundingCallService", () => {
  it("creates a draft using the canonical create permission", async () => {
    vi.mocked(insertFundingCall).mockResolvedValue(stored);

    const result = await createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    );

    expect(insertFundingCall).toHaveBeenCalledWith(actorId, input);
    expect(result.status).toBe("DRAFT");
  });

  it("allows draft form and eligibility versions on a draft call", async () => {
    vi.mocked(formVersionIsPublished).mockResolvedValue(false);
    vi.mocked(eligibilityRuleSetVersionIsPublished).mockResolvedValue(false);
    vi.mocked(insertFundingCall).mockResolvedValue(stored);

    const result = await createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    );

    expect(formVersionIsBindable).toHaveBeenCalledWith(formVersionId);
    expect(eligibilityRuleSetVersionIsBindable).toHaveBeenCalledWith(
      eligibilityRuleSetVersionId,
    );
    expect(formVersionIsPublished).not.toHaveBeenCalled();
    expect(eligibilityRuleSetVersionIsPublished).not.toHaveBeenCalled();
    expect(result.status).toBe("DRAFT");
  });

  it("creates a draft without publish-time version bindings", async () => {
    const draftInput = {
      ...input,
      eligibilityRuleSetVersionId: null,
      formVersionId: null,
      workflowTemplateVersionId: null,
    };
    const draft = {
      ...stored,
      eligibilityRuleSetVersionId: null,
      formVersionId: null,
      workflowTemplateVersionId: null,
    };
    vi.mocked(insertFundingCall).mockResolvedValue(draft);

    const result = await createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      draftInput,
    );

    expect(insertFundingCall).toHaveBeenCalledWith(actorId, draftInput);
    expect(formVersionIsBindable).not.toHaveBeenCalled();
    expect(eligibilityRuleSetVersionIsBindable).not.toHaveBeenCalled();
    expect(workflowTemplateVersionIsBindable).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      eligibilityRuleSetVersionId: null,
      formVersionId: null,
      status: "DRAFT",
      workflowTemplateVersionId: null,
    });
  });

  it("allows an eligibility version before an application form is bound", async () => {
    const draftInput = {
      ...input,
      formVersionId: null,
    };
    const draft = {
      ...stored,
      formVersionId: null,
    };
    vi.mocked(insertFundingCall).mockResolvedValue(draft);

    const result = await createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      draftInput,
    );

    expect(eligibilityRuleSetVersionIsBindable).toHaveBeenCalledWith(
      eligibilityRuleSetVersionId,
    );
    expect(getConfigurableFormFields).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      eligibilityRuleSetVersionId,
      formVersionId: null,
      status: "DRAFT",
    });
  });

  it("queries by public identifier using the read permission", async () => {
    vi.mocked(readFundingCallByPublicIdentifier).mockResolvedValue(stored);

    const result = await getFundingCallByPublicIdentifier(
      user([permissionCodes.fundingCallRead]),
      input.slug,
    );

    expect(readFundingCallByPublicIdentifier).toHaveBeenCalledWith(input.slug);
    expect(result.id).toBe(callId);
  });

  it("rejects a form version that is not bindable", async () => {
    vi.mocked(formVersionIsBindable).mockResolvedValue(false);

    await expect(createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    )).rejects.toBeInstanceOf(RequestValidationError);

    expect(insertFundingCall).not.toHaveBeenCalled();
  });

  it("rejects an eligibility ruleset version that is not bindable", async () => {
    vi.mocked(eligibilityRuleSetVersionIsBindable).mockResolvedValue(false);

    await expect(createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    )).rejects.toBeInstanceOf(RequestValidationError);

    expect(insertFundingCall).not.toHaveBeenCalled();
  });

  it("allows a draft workflow template version on a draft call", async () => {
    vi.mocked(insertFundingCall).mockResolvedValue(stored);

    const result = await createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    );

    expect(workflowTemplateVersionIsBindable).toHaveBeenCalledWith(
      workflowTemplateVersionId,
    );
    expect(result.status).toBe("DRAFT");
  });

  it("rejects a workflow template version that is not bindable", async () => {
    vi.mocked(workflowTemplateVersionIsBindable).mockResolvedValue(false);

    await expect(createFundingCall(
      user([permissionCodes.fundingCallCreate]),
      input,
    )).rejects.toBeInstanceOf(RequestValidationError);

    expect(insertFundingCall).not.toHaveBeenCalled();
  });

  it("denies draft edits without the canonical update permission", async () => {
    await expect(updateFundingCall(
      user([permissionCodes.fundingCallRead]),
      callId,
      { ...input, expectedRowVersion: 1 },
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateDraftFundingCall).not.toHaveBeenCalled();
  });
});
