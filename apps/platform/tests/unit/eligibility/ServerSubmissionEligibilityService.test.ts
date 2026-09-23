import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/eligibility/application/ServerAuthoritativeEligibilityService",
  async (importOriginal) => {
    const actual = await importOriginal<
      typeof import("@/modules/eligibility/application/ServerAuthoritativeEligibilityService")
    >();
    return {
      ...actual,
      prepareAuthoritativeEligibilityOutcome: vi.fn(),
    };
  },
);

import { serializeSubmissionSnapshot } from "@/modules/applications/domain/ApplicationSubmissionSnapshot";
import {
  AuthoritativeEligibilityUnavailableError,
  prepareAuthoritativeEligibilityOutcome,
} from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import { prepareSubmissionAuthoritativeEligibilityOutcome } from "@/modules/eligibility/application/ServerSubmissionEligibilityService";

const evaluatedAt = new Date("2026-09-23T08:00:00.000Z");

function snapshot() {
  const serialized = serializeSubmissionSnapshot({
    applicant: { userId: "applicant-1" },
    application: {
      businessSection: { employeeCount: 4 },
      declarationsSection: { compliance: true },
      financialSection: { amountRequested: 250000 },
      projectSection: { jobsCreated: 2 },
    },
    business: {
      employeeCount: 4,
      establishedYear: 2020,
      registrationNumber: "B-123",
      updatedAt: "2026-09-22T08:00:00.000Z",
    },
    declarations: { acceptance: { accepted: true } },
    documents: [],
    eligibilityRuleSetVersionId: "ruleset-version-1",
    form: {
      normalizedValues: { registered: true },
      responseRowVersion: 3,
      versionId: "form-version-1",
    },
    fundingCall: {
      id: "call-1",
      statusAtSubmission: "LIVE",
      terms: {
        closesAt: "2026-10-31T22:00:00.000Z",
        fundingInstrument: "Grant",
        maximumGrantAmount: "500000.00",
        minimumGrantAmount: "50000.00",
        opensAt: "2026-09-01T06:00:00.000Z",
        slug: "growth-fund",
        thematicArea: "Growth",
        title: "Growth Fund",
        totalBudgetEnvelope: "10000000.00",
      },
    },
    reference: "SMEF-2026-000001",
    schemaVersion: 1,
    submittedAt: evaluatedAt.toISOString(),
    workflowTemplateVersionId: "workflow-version-1",
  });
  return { ...serialized, id: "snapshot-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prepareAuthoritativeEligibilityOutcome).mockResolvedValue({
    applicationId: "application-1",
    contextReference: {
      applicationId: "application-1",
      applicationRowVersion: 8,
      businessProfileUpdatedAt: "2026-09-22T08:00:00.000Z",
      correlationId: "correlation-1",
      fundingCallId: "call-1",
    },
  } as never);
});

describe("submission authoritative eligibility", () => {
  it("evaluates the version-bound immutable snapshot", async () => {
    const lodged = snapshot();
    const result = await prepareSubmissionAuthoritativeEligibilityOutcome(
      {} as never,
      {
        actorId: "actor-1",
        applicationId: "application-1",
        applicationRowVersion: 8,
        correlationId: "correlation-1",
        evaluatedAt,
        evaluationNumber: 1,
        snapshot: lodged,
        workflowTaskId: null,
      },
    );

    expect(prepareAuthoritativeEligibilityOutcome).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        application: expect.objectContaining({
          businessSection: {
            employeeCount: 4,
            registered: true,
          },
          eligibilityRuleSetVersionId: "ruleset-version-1",
          formVersionId: "form-version-1",
        }),
        fundingCall: expect.objectContaining({
          id: "call-1",
          title: "Growth Fund",
        }),
      }),
    );
    expect(result.contextReference).toMatchObject({
      submissionSnapshotId: "snapshot-1",
      submissionSnapshotIntegrityHash: lodged.integrityHash,
    });
  });

  it("refuses evaluation when snapshot content does not match its hash", async () => {
    const lodged = snapshot();
    lodged.snapshotContent.business = { registrationNumber: "CHANGED" };

    await expect(prepareSubmissionAuthoritativeEligibilityOutcome(
      {} as never,
      {
        actorId: "actor-1",
        applicationId: "application-1",
        applicationRowVersion: 8,
        correlationId: "correlation-1",
        evaluatedAt,
        evaluationNumber: 1,
        snapshot: lodged,
        workflowTaskId: null,
      },
    )).rejects.toBeInstanceOf(AuthoritativeEligibilityUnavailableError);
    expect(prepareAuthoritativeEligibilityOutcome).not.toHaveBeenCalled();
  });
});
