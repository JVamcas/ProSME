import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
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

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const input = {
  closesAt: "2027-03-31T15:00:00.000Z",
  description: "Growth funding for qualifying SMEs.",
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

  it("queries by public identifier using the read permission", async () => {
    vi.mocked(readFundingCallByPublicIdentifier).mockResolvedValue(stored);

    const result = await getFundingCallByPublicIdentifier(
      user([permissionCodes.fundingCallRead]),
      input.slug,
    );

    expect(readFundingCallByPublicIdentifier).toHaveBeenCalledWith(input.slug);
    expect(result.id).toBe(callId);
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
