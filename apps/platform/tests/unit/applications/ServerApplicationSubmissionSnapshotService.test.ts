import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationSubmissionSnapshotRepository",
  () => ({ readSubmissionSnapshotAndAudit: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { serializeSubmissionSnapshot } from "@/modules/applications/domain/ApplicationSubmissionSnapshot";
import { getApplicationSubmissionSnapshot } from "@/modules/applications/ServerApplicationSubmissionSnapshotService";
import { readSubmissionSnapshotAndAudit } from "@/modules/applications/infrastructure/ApplicationSubmissionSnapshotRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const applicationId = "20000000-0000-4000-8000-000000000001";

function user(grants: string[]): AuthenticatedUser {
  const now = new Date("2026-09-23T08:00:00.000Z");
  return {
    capabilities: new Set(grants),
    createdAt: now,
    displayName: "Snapshot reader",
    email: "reader@example.test",
    id: actorId,
    identitySubject: "firebase-reader",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: now,
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  const serialized = serializeSubmissionSnapshot({
    applicant: {},
    application: {},
    business: {},
    declarations: {},
    documents: [],
    eligibilityRuleSetVersionId: "ruleset-version-1",
    form: {
      normalizedValues: {},
      responseRowVersion: 1,
      versionId: "form-version-1",
    },
    fundingCall: {},
    reference: "SMEF-2026-000001",
    schemaVersion: 1,
    submittedAt: "2026-09-23T08:00:00.000Z",
    workflowTemplateVersionId: "workflow-version-1",
  });
  vi.mocked(readSubmissionSnapshotAndAudit).mockResolvedValue({
    applicationId,
    ...serialized,
    schemaVersion: 1,
    submittedAt: new Date("2026-09-23T08:00:00.000Z"),
  });
});

describe("application submission snapshot service", () => {
  it("passes canonical permission scopes to the audited repository", async () => {
    await getApplicationSubmissionSnapshot(
      user([
        permissionCodes.fundingApplicationOwnRead,
        permissionCodes.workflowTaskAssignedRead,
      ]),
      applicationId,
      "30000000-0000-4000-8000-000000000001",
    );

    expect(readSubmissionSnapshotAndAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        allowAll: false,
        allowAssigned: true,
        allowOwn: true,
        applicationId,
      }),
    );
  });

  it("denies callers without an application read permission", async () => {
    await expect(getApplicationSubmissionSnapshot(
      user([]),
      applicationId,
      "30000000-0000-4000-8000-000000000001",
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readSubmissionSnapshotAndAudit).not.toHaveBeenCalled();
  });
});
