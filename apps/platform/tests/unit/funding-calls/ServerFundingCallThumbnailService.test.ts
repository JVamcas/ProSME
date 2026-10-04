import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/PublicFundingCallRepository", () => ({
  readPublicFundingCallById: vi.fn(),
}));
vi.mock("@/integrations/storage/GcsObjectPath", () => ({
  gcsObjectPathSegments: { utilities: { fundingCalls: ["funding-calls"] } },
  resolveGcsObjectPath: (...segments: string[]) => segments.join("/"),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallRepository", () => ({
  readFundingCallById: vi.fn(),
}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository", () => ({
  updateFundingCallThumbnailRecord: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";
import { uploadFundingCallThumbnail } from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";
import { readFundingCallById } from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import { updateFundingCallThumbnailRecord } from "@/modules/funding-calls/infrastructure/FundingCallThumbnailRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "20000000-0000-4000-8000-000000000001";
const stored = {
  allowResubmissionAfterWithdrawal: false,
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: new Date("2027-03-01T00:00:00.000Z"),
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  createdBy: actorId,
  description: "Funding call",
  eligibilityRuleSetVersionId: null,
  eligibilitySummary: null,
  formVersionId: null,
  fundingInstrument: null,
  id: callId,
  maximumGrantAmount: "100000.00",
  minimumGrantAmount: "10000.00",
  opensAt: new Date("2027-01-01T00:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "CALL-1",
  rowVersion: 3,
  slug: "call-1",
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  thematicArea: null,
  thumbnailContentType: null,
  thumbnailFileName: null,
  thumbnailObjectKey: null,
  title: "Call 1",
  totalBudgetEnvelope: "1000000.00",
  updatedAt: new Date("2026-09-01T00:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId: null,
};

function user(grants: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(grants),
    createdAt: new Date(),
    displayName: "Funding administrator",
    email: "funding@example.test",
    id: actorId,
    identitySubject: "funding-admin",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

function storage(): DocumentStorage {
  return {
    delete: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    read: vi.fn(async () => Buffer.alloc(0)),
  };
}

function png() {
  return new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
    "call.png",
    { type: "image/png" },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallById)
    .mockResolvedValueOnce(stored)
    .mockResolvedValueOnce({
      ...stored,
      rowVersion: 4,
      thumbnailContentType: "image/png",
      thumbnailFileName: "call.png",
      thumbnailObjectKey: "funding-calls/object.png",
    });
  vi.mocked(updateFundingCallThumbnailRecord).mockResolvedValue(true);
});

describe("funding call thumbnail service", () => {
  it("uploads a valid thumbnail for an editable draft", async () => {
    const objectStorage = storage();
    const result = await uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      3,
      png(),
      objectStorage,
    );

    expect(objectStorage.put).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "image/png",
    }));
    expect(updateFundingCallThumbnailRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        expectedRowVersion: 3,
        fundingCallId: callId,
      }),
    );
    expect(result.rowVersion).toBe(4);
    expect(result.thumbnailUrl).toContain(`/api/admin/funding-calls/${callId}/thumbnail`);
  });

  it("denies users without draft-edit permission", async () => {
    await expect(uploadFundingCallThumbnail(
      user([]),
      callId,
      3,
      png(),
      storage(),
    )).rejects.toThrow();
    expect(readFundingCallById).not.toHaveBeenCalled();
  });

  it("rejects a stale row version before writing storage", async () => {
    vi.mocked(readFundingCallById).mockReset().mockResolvedValue(stored);
    const objectStorage = storage();
    await expect(uploadFundingCallThumbnail(
      user([permissionCodes.fundingCallEditDraft]),
      callId,
      2,
      png(),
      objectStorage,
    )).rejects.toThrow("funding call changed");
    expect(objectStorage.put).not.toHaveBeenCalled();
  });
});
