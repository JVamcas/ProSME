import { vi } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import type { DocumentStorage } from "@/integrations/storage/DocumentStorage";

export const applicationId = "99e20de0-3558-4d63-90a4-8c9f5125df07";
export const fundingOpportunityId = "79e20de0-3558-4d63-90a4-8c9f5125df08";
export const formVersionId = "89e20de0-3558-4d63-90a4-8c9f5125df07";
export const versionId = "69e20de0-3558-4d63-90a4-8c9f5125df07";
export const actor = {
  capabilities: new Set([
    permissionCodes.fundingApplicationDocumentOwnRead,
    permissionCodes.fundingApplicationDocumentOwnUpload,
  ]),
  createdAt: new Date(),
  displayName: "Applicant",
  email: "applicant@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "firebase-subject",
  lastLoginAt: null,
  roleCodes: new Set(["applicant"]),
  status: "active",
  updatedAt: new Date(),
  userType: "applicant",
} satisfies AuthenticatedUser;

export function pdf(name = "registration.pdf") {
  return new File([Buffer.from("%PDF-1.7\nexample")], name, {
    type: "application/pdf",
  });
}

export function storage(): DocumentStorage {
  return {
    delete: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(Buffer.from("document")),
  };
}
