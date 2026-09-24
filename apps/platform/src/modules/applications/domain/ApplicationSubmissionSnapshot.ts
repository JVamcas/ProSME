import { createHash } from "node:crypto";

export const APPLICATION_SUBMISSION_SNAPSHOT_SCHEMA_VERSION = 1;

export type ApplicationSubmissionSnapshotContent = {
  application: Record<string, unknown>;
  applicant: Record<string, unknown>;
  business: Record<string, unknown>;
  declarations: Record<string, unknown>;
  documents: Record<string, unknown>[];
  eligibilityRuleSetVersionId: string;
  form: {
    normalizedValues: Record<string, unknown>;
    responseRowVersion: number;
    versionId: string;
  };
  fundingCall: Record<string, unknown>;
  reference: string;
  schemaVersion: number;
  submittedAt: string;
  workflowTemplateVersionId: string;
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => (
      `${JSON.stringify(key)}:${canonicalJson(child)}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCanonicalJson(canonicalContent: string): string {
  return createHash("sha256").update(canonicalContent).digest("hex");
}

export function serializeSubmissionSnapshot(
  content: ApplicationSubmissionSnapshotContent,
) {
  const canonicalContent = canonicalJson(content);
  return {
    canonicalContent,
    integrityHash: hashCanonicalJson(canonicalContent),
    snapshotContent: content,
  };
}

export function verifySubmissionSnapshotIntegrity(input: {
  canonicalContent: string;
  integrityHash: string;
  snapshotContent: ApplicationSubmissionSnapshotContent;
}) {
  return canonicalJson(input.snapshotContent) === input.canonicalContent
    && hashCanonicalJson(input.canonicalContent) === input.integrityHash;
}
