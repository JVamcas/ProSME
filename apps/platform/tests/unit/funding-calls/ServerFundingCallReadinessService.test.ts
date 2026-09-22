import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/application/ServerFormReadinessService", () => ({
  readFormReadinessProjection: vi.fn(),
}));
vi.mock("@/modules/eligibility/application/ServerEligibilityReadinessService", () => ({
  readEligibilityReadinessProjection: vi.fn(),
}));
vi.mock("@/modules/workflows/application/definitions/ServerWorkflowReadinessService", () => ({
  readWorkflowReadinessProjection: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallReadinessRepository", () => ({
  readFundingCallIdentifierConflicts: vi.fn(),
  readFundingCallReadinessDocuments: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  previewFundingCallReadiness,
  validateFundingCallReadiness,
} from "@/modules/funding-calls/application/ServerFundingCallReadinessService";
import {
  readFundingCallById,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import {
  readFundingCallIdentifierConflicts,
  readFundingCallReadinessDocuments,
} from "@/modules/funding-calls/infrastructure/FundingCallReadinessRepository";
import { readFormReadinessProjection } from "@/modules/forms/application/ServerFormReadinessService";
import { readEligibilityReadinessProjection } from "@/modules/eligibility/application/ServerEligibilityReadinessService";
import { readWorkflowReadinessProjection } from "@/modules/workflows/application/definitions/ServerWorkflowReadinessService";

const callId = "00000000-0000-4000-8000-000000000001";
const formId = "10000000-0000-4000-8000-000000000001";
const eligibilityId = "20000000-0000-4000-8000-000000000001";
const workflowId = "30000000-0000-4000-8000-000000000001";
const actorId = "40000000-0000-4000-8000-000000000001";
const now = new Date("2026-09-22T08:00:00.000Z");

const call = {
  closesAt: new Date("2027-03-31T15:00:00.000Z"),
  createdAt: now,
  createdBy: actorId,
  description: "Growth funding for qualifying SMEs.",
  eligibilityRuleSetVersionId: eligibilityId,
  eligibilitySummary: "Review the criteria before applying.",
  formVersionId: formId,
  fundingInstrument: "Grant",
  id: callId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2027-02-01T06:00:00.000Z"),
  publicContactEmail: "fund@example.test",
  publicContactName: "SME Fund",
  publicContactPhone: null,
  reference: "SME-2027-01",
  rowVersion: 3,
  slug: "sme-growth-fund-2027",
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  thematicArea: "Business growth",
  title: "SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: now,
  updatedBy: actorId,
  workflowTemplateVersionId: workflowId,
};

const documentField = {
  columnSpan: 1 as const,
  key: "registrationDocument",
  label: "Registration document",
  order: 1,
  required: true,
  sectionId: "documents",
  type: "DOCUMENT" as const,
};

const communicationTask = {
  type: "COMMUNICATION" as const,
};

const workflowStage = {
  enabled: true,
  publicStatusMapping: {
    description: "Your application is being reviewed.",
    label: "Under review",
    status: "UNDER_REVIEW" as const,
  },
  tasks: [communicationTask],
};

function reader(): AuthenticatedUser {
  return {
    capabilities: new Set([permissionCodes.fundingCallRead]),
    createdAt: now,
    displayName: "Funding reader",
    email: "reader@example.test",
    id: actorId,
    identitySubject: "reader-subject",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: now,
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById).mockResolvedValue(call);
  vi.mocked(readFundingCallIdentifierConflicts).mockResolvedValue({
    reference: false,
    slug: false,
  });
  vi.mocked(readFundingCallReadinessDocuments).mockResolvedValue([]);
  vi.mocked(readFormReadinessProjection).mockResolvedValue({
    active: true,
    fields: [documentField],
    status: "PUBLISHED",
    versionId: formId,
  } as never);
  vi.mocked(readEligibilityReadinessProjection).mockResolvedValue({
    active: true,
    rules: [],
    status: "PUBLISHED",
    versionId: eligibilityId,
  });
  vi.mocked(readWorkflowReadinessProjection).mockResolvedValue({
    active: true,
    graph: { stages: [workflowStage], transitions: [] },
    status: "PUBLISHED",
    validation: { errors: [], valid: true, warnings: [] },
    versionId: workflowId,
  } as never);
});

describe("funding call publication readiness", () => {
  it("returns a non-mutating ready result for complete current configuration", async () => {
    const result = await validateFundingCallReadiness(call, now);

    expect(result).toEqual({
      checkedAt: now.toISOString(),
      fundingCallId: callId,
      issues: [],
      ready: true,
      rowVersion: 3,
    });
  });

  it("requires the canonical read permission for administrator preview", async () => {
    await expect(previewFundingCallReadiness(
      { ...reader(), capabilities: new Set() },
      callId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);

    const result = await previewFundingCallReadiness(reader(), callId);
    expect(result.ready).toBe(true);
  });

  it("reports incomplete call data and exact unpublished versions", async () => {
    vi.mocked(readFormReadinessProjection).mockResolvedValue({
      active: true,
      fields: [],
      status: "RETIRED",
      versionId: formId,
    } as never);
    const result = await validateFundingCallReadiness({
      ...call,
      eligibilitySummary: null,
      publicContactEmail: null,
      publicContactName: null,
    }, now);

    expect(result.issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "PUBLIC_CONTACT_REQUIRED",
      "PUBLIC_GUIDANCE_NOT_CONFIGURED",
      "FORM_VERSION_NOT_PUBLISHED",
      "DOCUMENT_REQUIREMENTS_NOT_CONFIGURED",
    ]));
  });

  it("reports typed eligibility field incompatibility at the rule location", async () => {
    vi.mocked(readEligibilityReadinessProjection).mockResolvedValue({
      active: true,
      rules: [{
        conditionDefinition: {
          id: "condition-1",
          kind: "CONDITION",
          leftOperand: { key: "application.missing", kind: "FIELD" },
          operator: "EQUALS",
          rightOperand: { kind: "CONSTANT", value: true },
        },
        id: "rule-1",
      }],
      status: "PUBLISHED",
      versionId: eligibilityId,
    } as never);

    const result = await validateFundingCallReadiness(call, now);

    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "ELIGIBILITY_FIELD_INCOMPATIBLE",
      location: "rules.0.condition.children.0",
      owner: { id: eligibilityId, kind: "ELIGIBILITY_VERSION" },
    }));
  });

  it("reports workflow, notification, mapping, and public-document blockers", async () => {
    vi.mocked(readWorkflowReadinessProjection).mockResolvedValue({
      active: true,
      graph: {
        stages: [{
          ...workflowStage,
          publicStatusMapping: {
            ...workflowStage.publicStatusMapping,
            description: "",
          },
          tasks: [],
        }],
        transitions: [],
      },
      status: "PUBLISHED",
      validation: {
        errors: [{ code: "INITIAL_STAGE", message: "Add an initial stage.", path: "stages" }],
        valid: false,
        warnings: [],
      },
      versionId: workflowId,
    } as never);
    vi.mocked(readFundingCallReadinessDocuments).mockResolvedValue([{
      finalized: false,
      id: "50000000-0000-4000-8000-000000000001",
      label: "Guidelines",
      markedForPublication: false,
      publishedAt: null,
      securityCleared: false,
      url: "http://files.example.test/guidelines.pdf",
    }]);

    const result = await validateFundingCallReadiness(call, now);
    expect(result.issues.map((item) => item.code)).toEqual(expect.arrayContaining([
      "WORKFLOW_CONFIGURATION_INVALID",
      "APPLICANT_STATUS_MAPPING_MISSING",
      "NOTIFICATION_HOOK_MISSING",
      "PUBLIC_DOCUMENT_NOT_FINALIZED",
      "PUBLIC_DOCUMENT_NOT_SECURITY_CLEARED",
      "PUBLIC_DOCUMENT_NOT_MARKED_FOR_PUBLICATION",
      "PUBLIC_DOCUMENT_URL_UNSAFE",
    ]));
  });
});
