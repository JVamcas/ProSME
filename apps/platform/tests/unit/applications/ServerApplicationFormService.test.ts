import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationCreationRepository",
  () => ({ createApplicationDraft: vi.fn() }),
);
vi.mock(
  "@/modules/applications/infrastructure/ApplicationResponseRepository",
  () => ({
    readOwnedApplicationDraftResponse: vi.fn(),
    saveApplicationDraftResponse: vi.fn(),
  }),
);
vi.mock("@/modules/applications/infrastructure/ApplicationRepository", () => ({
  findOwnedApplication: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
}));
vi.mock("@/modules/applications/ServerApplicationService", async () => {
  const errors = await import("@/lib/resource-errors");
  return {
    ApplicationBusinessConflictError: class extends errors.ResourceConflictError {
      constructor() { super("Duplicate application."); }
    },
    ApplicationBusinessUnavailableError: class extends errors.ResourceNotFoundError {},
    ApplicationConflictError: class extends errors.ResourceConflictError {
      constructor() { super("Application conflict."); }
    },
    ApplicationNotFoundError: class extends errors.ResourceNotFoundError {},
    ApplicationOpportunityUnavailableError: class extends errors.ResourceNotFoundError {},
  };
});

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { RequestValidationError, ResourceConflictError } from "@/lib/resource-errors";
import {
  createApplicationDraft,
  getOwnApplicationDraft,
  saveOwnApplicationDraft,
} from "@/modules/applications/ServerApplicationFormService";
import { createApplicationDraft as persistApplicationDraft } from "@/modules/applications/infrastructure/ApplicationCreationRepository";
import {
  readOwnedApplicationDraftResponse,
  saveApplicationDraftResponse,
} from "@/modules/applications/infrastructure/ApplicationResponseRepository";
import { findOwnedApplication } from "@/modules/applications/infrastructure/ApplicationRepository";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const applicationId = "20000000-0000-4000-8000-000000000001";
const formVersionId = "30000000-0000-4000-8000-000000000001";
const rulesVersionId = "40000000-0000-4000-8000-000000000001";
const responseId = "50000000-0000-4000-8000-000000000001";
const businessId = "60000000-0000-4000-8000-000000000001";

function user(...permissions: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(permissions),
    createdAt: new Date(),
    displayName: "Applicant",
    email: "applicant@example.test",
    id: actorId,
    identitySubject: "firebase-applicant",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

const application = {
  businessId,
  businessSection: {},
  createdAt: new Date("2026-09-23T08:00:00.000Z"),
  deletedAt: null,
  currentSection: "business" as const,
  declarationAcceptance: null,
  declarationsSection: {},
  duplicatePolicy: "one_per_business" as const,
  eligibilityRuleSetVersionId: rulesVersionId,
  financialSection: {},
  formVersionId,
  fundingOpportunityId: "70000000-0000-4000-8000-000000000001",
  fundingOpportunityTitle: "Growth Fund",
  id: applicationId,
  latestDraftResponseId: responseId,
  ownerUserId: actorId,
  projectSection: {},
  reference: null,
  rowVersion: 2,
  sectionCompletion: {
    business: false,
    declarations: false,
    documents: false,
    financial: false,
    project: false,
  },
  status: "draft" as const,
  submissionSnapshotId: null,
  submittedAt: null,
  updatedAt: new Date("2026-09-23T08:00:00.000Z"),
  withdrawnAt: null,
};

const response = {
  formVersionId,
  id: responseId,
  rowVersion: 1,
  updatedAt: new Date("2026-09-23T08:00:00.000Z"),
  values: { NAME: "Saved value" },
};

const form = {
  fields: [{
    columnSpan: 1 as const,
    key: "NAME",
    label: "Name",
    order: 1,
    required: true,
    sectionId: "80000000-0000-4000-8000-000000000001",
    type: "TEXT" as const,
  }],
  instructions: null,
  sections: [{
    columnSpan: 1 as const,
    description: "",
    id: "80000000-0000-4000-8000-000000000001",
    key: "BASIC",
    order: 1,
    showContainer: true,
    title: "Basic information",
    visibilityCondition: null,
  }],
  submitLabel: "Submit",
  versionId: formVersionId,
  versionNumber: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findOwnedApplication).mockResolvedValue(application);
  vi.mocked(readOwnedApplicationDraftResponse).mockResolvedValue(response);
  vi.mocked(getFormRuntime).mockResolvedValue(form);
});

describe("application draft creation and exact-version autosave", () => {
  it("returns the initial exact-version draft for an idempotent create", async () => {
    vi.mocked(persistApplicationDraft).mockResolvedValue({
      applicationId,
      kind: "created",
    });
    const result = await createApplicationDraft(
      user(permissionCodes.fundingApplicationCreate),
      {
        businessId,
        correlationId: "90000000-0000-4000-8000-000000000001",
        fundingCallIdOrSlug: "growth-fund",
        idempotencyKey: "a0000000-0000-4000-8000-000000000001",
      },
    );
    expect(result).toMatchObject({
      draftResponse: { rowVersion: 1, values: { NAME: "Saved value" } },
      form: { versionId: formVersionId, versionNumber: 3 },
      formVersionId,
    });
    expect(persistApplicationDraft).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: actorId,
      businessId,
      fundingCallIdOrSlug: "growth-fund",
      requestFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });

  it("loads the form version stored on the application", async () => {
    await getOwnApplicationDraft(
      user(permissionCodes.fundingApplicationOwnRead),
      applicationId,
    );
    expect(getFormRuntime).toHaveBeenCalledWith(formVersionId);
  });

  it("rejects unknown fields before persisting an autosave", async () => {
    await expect(saveOwnApplicationDraft(
      user(permissionCodes.fundingApplicationOwnUpdate),
      applicationId,
      {
        correlationId: "90000000-0000-4000-8000-000000000001",
        expectedApplicationRowVersion: 2,
        expectedResponseRowVersion: 1,
        idempotencyKey: "b0000000-0000-4000-8000-000000000001",
        values: { UNKNOWN: "not in version three" },
      },
    )).rejects.toBeInstanceOf(RequestValidationError);
    expect(saveApplicationDraftResponse).not.toHaveBeenCalled();
  });

  it("returns safe current versions when another session won the save", async () => {
    vi.mocked(saveApplicationDraftResponse).mockResolvedValue({
      applicationRowVersion: 5,
      kind: "conflict",
      responseRowVersion: 4,
    });
    const promise = saveOwnApplicationDraft(
      user(permissionCodes.fundingApplicationOwnUpdate),
      applicationId,
      {
        correlationId: "90000000-0000-4000-8000-000000000001",
        expectedApplicationRowVersion: 2,
        expectedResponseRowVersion: 1,
        idempotencyKey: "c0000000-0000-4000-8000-000000000001",
        values: { NAME: "Concurrent edit" },
      },
    );
    await expect(promise).rejects.toMatchObject({
      conflict: { applicationRowVersion: 5, responseRowVersion: 4 },
    });
    await expect(promise).rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("rejects writes after the repository observes a terminal status", async () => {
    vi.mocked(saveApplicationDraftResponse).mockResolvedValue({
      kind: "not_writable",
    });
    await expect(saveOwnApplicationDraft(
      user(permissionCodes.fundingApplicationOwnUpdate),
      applicationId,
      {
        correlationId: "90000000-0000-4000-8000-000000000001",
        expectedApplicationRowVersion: 2,
        expectedResponseRowVersion: 1,
        idempotencyKey: "d0000000-0000-4000-8000-000000000001",
        values: { NAME: "Late edit" },
      },
    )).rejects.toThrow("no longer accepts draft changes");
  });
});
