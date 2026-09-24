import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readSubmissionSnapshotAndAudit } from "@/modules/applications/infrastructure/ApplicationSubmissionSnapshotRepository";

const input = {
  actorId: "10000000-0000-4000-8000-000000000001",
  allowAll: false,
  allowAssigned: false,
  allowOwn: true,
  applicationId: "20000000-0000-4000-8000-000000000002",
  correlationId: "correlation",
};

beforeEach(() => vi.clearAllMocks());

describe("application submission snapshot repository", () => {
  it.each([
    "2026-09-24T08:00:00.000Z",
    new Date("2026-09-24T08:00:00.000Z"),
  ])("normalizes the raw submitted timestamp %s", async (timestamp) => {
    const execute = vi.fn().mockResolvedValue({ rows: [{
      applicationId: input.applicationId,
      canonicalContent: "{}",
      integrityHash: "hash",
      schemaVersion: 1,
      snapshotContent: {},
      submittedAt: timestamp,
    }] });
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const transaction = vi.fn(async (callback) => callback({ execute, insert }));
    vi.mocked(getDatabase).mockReturnValue({ transaction } as never);

    const snapshot = await readSubmissionSnapshotAndAudit(input);

    expect(snapshot?.submittedAt).toBeInstanceOf(Date);
    expect(snapshot?.submittedAt.toISOString()).toBe("2026-09-24T08:00:00.000Z");
    expect(values).toHaveBeenCalledOnce();
  });
});
