import sharp from "sharp";
import { vi } from "vitest";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";

export const actorId = "10000000-0000-4000-8000-000000000001";
export const callId = "20000000-0000-4000-8000-000000000001";
export const stored = {
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

export function user(grants: string[]): AuthenticatedUser {
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

export function storage(): DocumentStorage {
  return {
    delete: vi.fn(async () => undefined),
    put: vi.fn(async () => undefined),
    read: vi.fn(async () => Buffer.alloc(0)),
  };
}

export async function png() {
  const body = await sharp({
    create: { width: 1200, height: 675, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(body)], "call.png", { type: "image/png" });
}
