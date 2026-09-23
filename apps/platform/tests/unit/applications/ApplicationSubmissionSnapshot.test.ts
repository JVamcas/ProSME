import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  serializeSubmissionSnapshot,
  verifySubmissionSnapshotIntegrity,
  type ApplicationSubmissionSnapshotContent,
} from "@/modules/applications/domain/ApplicationSubmissionSnapshot";

function content(): ApplicationSubmissionSnapshotContent {
  return {
    application: { id: "application-1", values: { z: 2, a: 1 } },
    applicant: { displayName: "Applicant" },
    business: { legalName: "Example SME" },
    declarations: { acceptance: { accepted: true } },
    documents: [{ checksumSha256: "abc", id: "document-version-1" }],
    eligibilityRuleSetVersionId: "eligibility-version-1",
    form: {
      normalizedValues: { amount: 100, registered: true },
      responseRowVersion: 4,
      versionId: "form-version-1",
    },
    fundingCall: { id: "call-1", terms: { title: "Growth Fund" } },
    reference: "SMEF-2026-000001",
    schemaVersion: 1,
    submittedAt: "2026-09-23T08:00:00.000Z",
    workflowTemplateVersionId: "workflow-version-1",
  };
}

describe("application submission snapshot", () => {
  it("serializes object keys canonically and produces a reproducible hash", () => {
    const first = serializeSubmissionSnapshot(content());
    const reordered = {
      ...content(),
      application: { values: { a: 1, z: 2 }, id: "application-1" },
    };
    const second = serializeSubmissionSnapshot(reordered);

    expect(first.canonicalContent).toBe(canonicalJson(first.snapshotContent));
    expect(first.canonicalContent).toBe(second.canonicalContent);
    expect(first.integrityHash).toBe(second.integrityHash);
    expect(verifySubmissionSnapshotIntegrity(first)).toBe(true);
  });

  it("detects changed lodged content", () => {
    const snapshot = serializeSubmissionSnapshot(content());
    const changed = {
      ...snapshot,
      snapshotContent: {
        ...snapshot.snapshotContent,
        business: { legalName: "Changed SME" },
      },
    };

    expect(verifySubmissionSnapshotIntegrity(changed)).toBe(false);
  });
});
