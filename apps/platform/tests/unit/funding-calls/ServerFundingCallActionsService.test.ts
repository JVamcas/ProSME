import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallCommandRepository",
  () => ({
    cloneFundingCallRecord: vi.fn(),
    deleteFundingCallRecord: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  cloneFundingCall,
  deleteFundingCall,
} from "@/modules/funding-calls/application/ServerFundingCallService";
import {
  cloneFundingCallRecord,
  deleteFundingCallRecord,
} from "@/modules/funding-calls/infrastructure/FundingCallCommandRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const callId = "00000000-0000-4000-8000-000000000042";
const clonedId = "00000000-0000-4000-8000-000000000043";
const cloned = {
  applicationDuplicatePolicy: "one_per_business" as const,
  closesAt: new Date("2027-03-31T15:00:00.000Z"),
  createdAt: new Date("2026-09-23T08:00:00.000Z"),
  createdBy: actorId,
  description: "Cloned call",
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  eligibilitySummary: "Eligible SMEs",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingInstrument: "Grant",
  id: clonedId,
  maximumGrantAmount: "500000.00",
  minimumGrantAmount: "50000.00",
  opensAt: new Date("2027-02-01T06:00:00.000Z"),
  publicContactEmail: null,
  publicContactName: null,
  publicContactPhone: null,
  reference: "SME-2027-01-COPY-12345678",
  rowVersion: 1,
  slug: "sme-growth-fund-2027-copy-12345678",
  status: "DRAFT" as const,
  suspendedFromStatus: null,
  thematicArea: "Business growth",
  title: "Copy of SME Growth Fund 2027",
  totalBudgetEnvelope: "10000000.00",
  updatedAt: new Date("2026-09-23T08:00:00.000Z"),
  updatedBy: actorId,
  workflowTemplateVersionId: "40000000-0000-4000-8000-000000000001",
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

beforeEach(() => vi.clearAllMocks());

describe("funding call clone and delete actions", () => {
  it("clones using the canonical create permission", async () => {
    vi.mocked(cloneFundingCallRecord).mockResolvedValue(cloned);

    const result = await cloneFundingCall(
      user([permissionCodes.fundingCallCreate]),
      callId,
    );

    expect(cloneFundingCallRecord).toHaveBeenCalledWith(actorId, callId);
    expect(result).toMatchObject({ id: clonedId, status: "DRAFT" });
  });

  it("denies cloning without create permission", async () => {
    await expect(cloneFundingCall(
      user([permissionCodes.fundingCallRead]),
      callId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(cloneFundingCallRecord).not.toHaveBeenCalled();
  });

  it("reports a missing clone source", async () => {
    vi.mocked(cloneFundingCallRecord).mockResolvedValue(null);

    await expect(cloneFundingCall(
      user([permissionCodes.fundingCallCreate]),
      callId,
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("deletes using the canonical delete permission", async () => {
    vi.mocked(deleteFundingCallRecord).mockResolvedValue("deleted");

    await expect(deleteFundingCall(
      user([permissionCodes.fundingCallDelete]),
      callId,
    )).resolves.toEqual({ id: callId });
    expect(deleteFundingCallRecord).toHaveBeenCalledWith(callId);
  });

  it("rejects deletion when applications exist", async () => {
    vi.mocked(deleteFundingCallRecord).mockResolvedValue("has_applications");

    await expect(deleteFundingCall(
      user([permissionCodes.fundingCallDelete]),
      callId,
    )).rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("denies deletion without delete permission", async () => {
    await expect(deleteFundingCall(
      user([permissionCodes.fundingCallRead]),
      callId,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(deleteFundingCallRecord).not.toHaveBeenCalled();
  });
});
